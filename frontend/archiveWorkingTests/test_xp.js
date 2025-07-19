// Test XP calculation
const economyData = { xp: 50, level: 1 };
const currentLevel = economyData.level || 1;

// My calculation
const xpForCurrentLevel = currentLevel === 1 ? 0 : 100 + ((currentLevel - 2) * (currentLevel - 2) * 50);
const xpForNextLevel = 100 + ((currentLevel - 1) * (currentLevel - 1) * 50);
const xpInCurrentLevel = economyData.xp - xpForCurrentLevel;
const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;

console.log('Current Level:', currentLevel);
console.log('XP for current level:', xpForCurrentLevel);
console.log('XP for next level:', xpForNextLevel);
console.log('XP in current level:', xpInCurrentLevel);
console.log('XP needed for level:', xpNeededForLevel);
console.log('Display should be:', xpInCurrentLevel + ' / ' + xpNeededForLevel);
