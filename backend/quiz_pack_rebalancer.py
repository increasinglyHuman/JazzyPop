"""
Quiz Pack Rebalancer Service
Finds partial quiz packs and rebalances them to ensure all packs have exactly 10 quizzes
"""

import asyncio
import asyncpg
import logging
from typing import List, Dict, Tuple, Optional
from datetime import datetime
import json

logger = logging.getLogger(__name__)


class QuizPackRebalancer:
    """Service to rebalance quiz packs after validation failures"""
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
        self.target_pack_size = 10
        
    async def rebalance_all_packs(self) -> Dict[str, int]:
        """
        Main rebalancing process
        Returns stats about the rebalancing operation
        """
        stats = {
            "packs_examined": 0,
            "packs_fixed": 0,
            "quizzes_moved": 0,
            "packs_deleted": 0,
            "orphan_quizzes_saved": 0,
            "errors": 0
        }
        
        try:
            # Find all partial packs
            partial_packs = await self._find_partial_packs()
            stats["packs_examined"] = len(partial_packs)
            
            logger.info(f"Found {len(partial_packs)} partial packs to rebalance")
            
            # Process each partial pack
            for pack in partial_packs:
                try:
                    fixed = await self._rebalance_pack(pack)
                    if fixed:
                        stats["packs_fixed"] += 1
                        stats["quizzes_moved"] += fixed["quizzes_moved"]
                except Exception as e:
                    logger.error(f"Error rebalancing pack {pack['set_id']}: {e}")
                    stats["errors"] += 1
            
            # Clean up any remaining partial packs (leftovers)
            leftover_stats = await self._cleanup_leftover_packs()
            stats["packs_deleted"] += leftover_stats["deleted"]
            stats["orphan_quizzes_saved"] += leftover_stats["quizzes_saved"]
            
            # Delete any empty packs
            deleted = await self._delete_empty_packs()
            stats["packs_deleted"] += deleted
            
            logger.info(f"Rebalancing complete: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Fatal error in rebalancing: {e}")
            stats["errors"] += 1
            return stats
    
    async def _find_partial_packs(self) -> List[Dict]:
        """Find all quiz sets with fewer than 10 quizzes"""
        async with self.db_pool.acquire() as conn:
            query = """
            SELECT 
                qs.set_id,
                qs.category,
                qs.mode,
                COUNT(qsq.quiz_id) as quiz_count,
                qs.created_at,
                ARRAY_AGG(qsq.quiz_id ORDER BY qsq.position) as quiz_ids
            FROM quiz_sets qs
            LEFT JOIN quiz_set_questions qsq ON qs.set_id = qsq.set_id
            WHERE qs.is_active = true
            GROUP BY qs.set_id, qs.category, qs.mode, qs.created_at
            HAVING COUNT(qsq.quiz_id) > 0 AND COUNT(qsq.quiz_id) < 10
            ORDER BY COUNT(qsq.quiz_id) DESC, qs.created_at ASC
            """
            rows = await conn.fetch(query)
            return [dict(row) for row in rows]
    
    async def _rebalance_pack(self, pack: Dict) -> Optional[Dict]:
        """
        Rebalance a single pack by finding compatible donors
        Returns info about the rebalancing or None if couldn't fix
        """
        set_id = pack['set_id']
        category = pack['category']
        mode = pack['mode']
        current_count = pack['quiz_count']
        needed = self.target_pack_size - current_count
        
        logger.info(f"Rebalancing pack {set_id} ({category}/{mode}): has {current_count}, needs {needed}")
        
        moved_count = 0
        
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                # Keep looking for donors until we have 10 or can't find more
                while needed > 0:
                    # Find a compatible donor pack
                    donor = await self._find_donor_pack(conn, category, mode, set_id, needed)
                    if not donor:
                        logger.warning(f"No donor found for {set_id}, stopped at {current_count + moved_count}")
                        break
                    
                    # Calculate how many to transfer
                    donor_available = donor['quiz_count']
                    can_take = min(needed, donor_available - 1)  # Leave at least 1 in donor
                    
                    if donor_available <= needed:
                        # Take all from donor (it will be deactivated later)
                        can_take = donor_available
                    
                    # Transfer quizzes
                    transferred = await self._transfer_quizzes(
                        conn, 
                        donor['set_id'], 
                        set_id,
                        can_take,
                        current_count + moved_count
                    )
                    
                    moved_count += transferred
                    needed -= transferred
                    
                    logger.info(f"Transferred {transferred} quizzes from {donor['set_id']} to {set_id}")
        
        if moved_count > 0:
            return {
                "set_id": set_id,
                "quizzes_moved": moved_count,
                "final_count": current_count + moved_count
            }
        return None
    
    async def _find_donor_pack(self, conn: asyncpg.Connection, category: str, 
                               mode: str, exclude_id: str, min_needed: int) -> Optional[Dict]:
        """Find a pack that can donate quizzes"""
        query = """
        SELECT 
            qs.set_id,
            COUNT(qsq.quiz_id) as quiz_count
        FROM quiz_sets qs
        JOIN quiz_set_questions qsq ON qs.set_id = qsq.set_id
        WHERE qs.is_active = true
            AND qs.category = $1
            AND qs.mode = $2
            AND qs.set_id != $3
        GROUP BY qs.set_id
        HAVING COUNT(qsq.quiz_id) > 0 
            AND (COUNT(qsq.quiz_id) < 10 OR COUNT(qsq.quiz_id) >= $4)
        ORDER BY 
            CASE 
                WHEN COUNT(qsq.quiz_id) < 10 THEN COUNT(qsq.quiz_id)
                ELSE 1000 - COUNT(qsq.quiz_id)
            END ASC
        LIMIT 1
        """
        
        row = await conn.fetchrow(query, category, mode, exclude_id, min_needed)
        return dict(row) if row else None
    
    async def _transfer_quizzes(self, conn: asyncpg.Connection, donor_id: str, 
                                recipient_id: str, count: int, position_offset: int) -> int:
        """Transfer quizzes from donor to recipient"""
        # Get quizzes to transfer
        select_query = """
        SELECT quiz_id, position
        FROM quiz_set_questions
        WHERE set_id = $1
        ORDER BY position DESC
        LIMIT $2
        """
        
        quiz_rows = await conn.fetch(select_query, donor_id, count)
        if not quiz_rows:
            return 0
        
        # Update their set_id and positions
        for i, row in enumerate(quiz_rows):
            update_query = """
            UPDATE quiz_set_questions
            SET set_id = $1,
                position = $2
            WHERE quiz_id = $3 AND set_id = $4
            """
            await conn.execute(
                update_query, 
                recipient_id, 
                position_offset + i,
                row['quiz_id'],
                donor_id
            )
        
        return len(quiz_rows)
    
    async def _cleanup_leftover_packs(self) -> Dict[str, int]:
        """
        Clean up leftover partial packs that couldn't be filled
        Try to save orphan quizzes by creating a new full pack if possible
        """
        stats = {"deleted": 0, "quizzes_saved": 0}
        
        async with self.db_pool.acquire() as conn:
            # Find all remaining partial packs
            leftover_query = """
            SELECT 
                qs.set_id,
                qs.category,
                qs.mode,
                COUNT(qsq.quiz_id) as quiz_count,
                ARRAY_AGG(qsq.quiz_id ORDER BY qsq.position) as quiz_ids
            FROM quiz_sets qs
            JOIN quiz_set_questions qsq ON qs.set_id = qsq.set_id
            WHERE qs.is_active = true
            GROUP BY qs.set_id, qs.category, qs.mode
            HAVING COUNT(qsq.quiz_id) < 10
            ORDER BY qs.category, qs.mode, COUNT(qsq.quiz_id) DESC
            """
            
            leftovers = await conn.fetch(leftover_query)
            
            # Group by category/mode to try combining leftovers
            category_mode_groups = {}
            for row in leftovers:
                key = (row['category'], row['mode'])
                if key not in category_mode_groups:
                    category_mode_groups[key] = []
                category_mode_groups[key].append(dict(row))
            
            # Try to combine leftovers within same category/mode
            for (category, mode), packs in category_mode_groups.items():
                orphan_quizzes = []
                pack_ids_to_delete = []
                
                # Collect all quizzes from leftover packs
                for pack in packs:
                    orphan_quizzes.extend(pack['quiz_ids'])
                    pack_ids_to_delete.append(pack['set_id'])
                
                # If we have enough for at least one full pack, create it
                while len(orphan_quizzes) >= self.target_pack_size:
                    # Create a new pack with 10 quizzes
                    new_pack_quizzes = orphan_quizzes[:self.target_pack_size]
                    orphan_quizzes = orphan_quizzes[self.target_pack_size:]
                    
                    await self._create_salvage_pack(
                        conn, category, mode, new_pack_quizzes
                    )
                    stats["quizzes_saved"] += len(new_pack_quizzes)
                
                # Delete the now-empty leftover packs
                if pack_ids_to_delete:
                    await self._delete_packs(conn, pack_ids_to_delete)
                    stats["deleted"] += len(pack_ids_to_delete)
                
                # Log any truly orphaned quizzes (less than 10 remaining)
                if orphan_quizzes:
                    logger.warning(
                        f"Deleting {len(orphan_quizzes)} orphan quizzes from "
                        f"{category}/{mode} - not enough for a full pack"
                    )
                    await self._archive_orphan_quizzes(conn, orphan_quizzes)
        
        return stats
    
    async def _create_salvage_pack(self, conn: asyncpg.Connection, 
                                   category: str, mode: str, quiz_ids: List[str]):
        """Create a new pack from salvaged quizzes"""
        # Create new quiz set
        create_set_query = """
        INSERT INTO quiz_sets (category, mode, is_active, metadata)
        VALUES ($1, $2, true, jsonb_build_object(
            'created_by', 'rebalancer',
            'salvaged_pack', true,
            'created_at', CURRENT_TIMESTAMP
        ))
        RETURNING set_id
        """
        
        new_set_id = await conn.fetchval(create_set_query, category, mode)
        
        # Add quizzes to the new set
        for i, quiz_id in enumerate(quiz_ids):
            insert_query = """
            INSERT INTO quiz_set_questions (set_id, quiz_id, position)
            VALUES ($1, $2, $3)
            """
            await conn.execute(insert_query, new_set_id, quiz_id, i)
        
        logger.info(f"Created salvage pack {new_set_id} with {len(quiz_ids)} quizzes")
    
    async def _archive_orphan_quizzes(self, conn: asyncpg.Connection, quiz_ids: List[str]):
        """Archive orphan quizzes before deletion for potential recovery"""
        archive_query = """
        INSERT INTO archived_orphan_quizzes (quiz_id, archived_at, metadata)
        SELECT 
            q.id,
            CURRENT_TIMESTAMP,
            jsonb_build_object(
                'reason', 'insufficient_for_pack',
                'original_data', row_to_json(q.*)
            )
        FROM quizzes q
        WHERE q.id = ANY($1)
        ON CONFLICT (quiz_id) DO NOTHING
        """
        await conn.execute(archive_query, quiz_ids)
    
    async def _delete_packs(self, conn: asyncpg.Connection, set_ids: List[str]):
        """Completely delete quiz sets and their associations"""
        # First delete quiz set questions
        delete_questions = """
        DELETE FROM quiz_set_questions 
        WHERE set_id = ANY($1)
        """
        await conn.execute(delete_questions, set_ids)
        
        # Then delete the sets themselves
        delete_sets = """
        DELETE FROM quiz_sets
        WHERE set_id = ANY($1)
        """
        await conn.execute(delete_sets, set_ids)
    
    async def _delete_empty_packs(self) -> int:
        """Delete any packs that have no quizzes left"""
        async with self.db_pool.acquire() as conn:
            # Find empty packs
            find_empty = """
            SELECT qs.set_id
            FROM quiz_sets qs
            LEFT JOIN quiz_set_questions qsq ON qs.set_id = qsq.set_id
            WHERE qs.is_active = true
            GROUP BY qs.set_id
            HAVING COUNT(qsq.quiz_id) = 0
            """
            
            empty_packs = await conn.fetch(find_empty)
            empty_ids = [row['set_id'] for row in empty_packs]
            
            if empty_ids:
                await self._delete_packs(conn, empty_ids)
                logger.info(f"Deleted {len(empty_ids)} empty quiz sets")
                
            return len(empty_ids)


async def run_rebalancer(db_pool: asyncpg.Pool):
    """Run the rebalancer as a one-time task"""
    rebalancer = QuizPackRebalancer(db_pool)
    stats = await rebalancer.rebalance_all_packs()
    return stats


async def run_rebalancer_service(db_pool: asyncpg.Pool, interval_minutes: int = 30):
    """Run the rebalancer as a periodic service"""
    rebalancer = QuizPackRebalancer(db_pool)
    
    while True:
        try:
            logger.info("Starting rebalancing cycle")
            stats = await rebalancer.rebalance_all_packs()
            logger.info(f"Rebalancing cycle complete: {stats}")
            
            # Sleep until next cycle
            await asyncio.sleep(interval_minutes * 60)
            
        except Exception as e:
            logger.error(f"Error in rebalancer service: {e}")
            # Sleep a bit before retrying
            await asyncio.sleep(60)