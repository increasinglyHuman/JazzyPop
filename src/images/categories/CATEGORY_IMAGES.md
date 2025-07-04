# Category Images Documentation

## Overview
This directory contains SVG/PNG images for quiz categories used in JazzyPop. Each image corresponds to a category used in the quiz generation system.

## Category Image Files

| Image File | Category Code | Status |
|------------|---------------|--------|
| ancient_architecture.svg | ancient_architecture | ✅ Match |
| animals.svg | animals | ✅ Match |
| archaeology.svg | archaeology | ✅ Match (renamed from archaology.svg) |
| architect.svg | - | ❌ Not used in quiz generator |
| art.svg | art | ✅ Match |
| collections.svg | collections | ✅ Match |
| dinosaurs.png | dinosaurs | ✅ Match |
| fame_glory.svg | fame_glory | ✅ Match |
| famous_lies.svg | famous_lies | ✅ Match |
| fashion_design.svg | fashion_design | ✅ Match |
| film.svg | film | ✅ Match |
| food_cuisine.svg | food_cuisine | ✅ Match |
| gaming.svg | gaming | ✅ Match |
| geography.svg | geography | ✅ Match |
| history.svg | history | ✅ Match |
| horror_films.svg | horror_films | ✅ Match (renamed from horrorz_films.svg) |
| internet_culture.svg | internet_culture | ✅ Match |
| inventions.svg | inventions | ✅ Match |
| jokes.svg | jokes | ✅ Match |
| language_evolution.svg | language_evolution | ✅ Match |
| literature.svg | literature | ✅ Match |
| music.svg | music | ✅ Match |
| mythology.svg | mythology | ✅ Match |
| nature.svg | nature | ✅ Match |
| pop_culture.svg | pop_culture | ✅ Match |
| pop_culture2.svg | - | ❌ Duplicate/unused |
| scandal_mischief.svg | scandal_mischief | ✅ Match |
| science.svg | science | ✅ Match |
| space.svg | space | ✅ Match |
| sports.svg | sports | ✅ Match |
| technology.svg | technology | ✅ Match |
| wicca.svg | wicca | ✅ Match |

## Missing Images

The following categories from quiz_generator.py do not have corresponding images:
- `architecture` (only ancient_architecture exists)
- `fashion` (only fashion_design exists)
- `revolutions` (no image at all)

## Issues Fixed ✓

1. **✅ Renamed `archaology.svg`** → `archaeology.svg` (fixed typo)
2. **✅ Renamed `horrorz_films.svg`** → `horror_films.svg` (matched code)
3. **✅ Updated CardManager.js** to include all category image mappings

## Remaining Issues

1. **Add missing images**:
   - `architecture.svg`
   - `fashion.svg`
   - `revolutions.svg`
4. **Consider removing**:
   - `architect.svg` (not used)
   - `pop_culture2.svg` (duplicate)

## Quiz Generator Categories Reference

The complete list from `/backend/quiz_generator.py`:
```python
[
    "science", "history", "geography", "pop_culture", 
    "technology", "nature", "sports", "literature",
    "music", "food_cuisine", "film", "gaming",
    "art", "mythology", "space", "animals",
    "inventions", "internet_culture", "fashion", "architecture",
    "collections", "ancient_architecture", "archaeology",
    "dinosaurs", "fashion_design", "wicca",
    "famous_lies", "scandal_mischief", "fame_glory",
    "horror_films", "revolutions", "language_evolution", "jokes"
]
```

Total categories in code: 33
Total unique images: 32 (including unused ones)