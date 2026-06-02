/* eslint-disable */
let simulationResults = [];
let refreshCounts = [];
let levelUpCounts = [];

// WS-DamageSim Adapter — extracted from nofameway.github.io/WS-DamageSim/
// Original author: NoFaMe  License: public (web tool)
// Adapted for Node.js: DOM dependencies removed, pure functions exported.


export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


export function parseDamageSequence(dmgStr) {
    if (!dmgStr) return [];
    
    let result = [];
    let i = 0;
    
    while (i < dmgStr.length) {
        // 跳过空格和逗号
        if (dmgStr[i] === ' ' || dmgStr[i] === ',') {
            i++;
            continue;
        }
        
        // 处理传火前缀
        let isSpecialZj = false;
        if (dmgStr[i] === '*') {
            isSpecialZj = true;
            i++;
        }
        
        // 处理数字伤害
        if (/\d/.test(dmgStr[i])) {
            let j = i;
            while (j < dmgStr.length && /\d/.test(dmgStr[j])) {
                j++;
            }
            let num = parseInt(dmgStr.substring(i, j));
            
            // 检查zj追加效果
            if (j + 2 < dmgStr.length && dmgStr.substring(j, j + 2) === 'zj' && dmgStr[j + 2] === '(') {
                let bracketCount = 1;
                let k = j + 3;
                while (k < dmgStr.length && bracketCount > 0) {
                    if (dmgStr[k] === '(') bracketCount++;
                    else if (dmgStr[k] === ')') bracketCount--;
                    k++;
                }
                
                if (bracketCount === 0) {
                    let innerSeq = parseDamageSequence(dmgStr.substring(j + 3, k - 1));
                    if (isSpecialZj) {
                        result.push([num, 'szj', innerSeq]);
                    } else {
                        result.push([num, 'zj', innerSeq]);
                    }
                    i = k;
                } else {
                    throw new Error('括号不匹配');
                }
            } else {
                result.push(num);
                i = j;
            }
        }
        // 处理fx反洗
        else if (dmgStr.substring(i, i + 2) === 'fx' && i + 2 < dmgStr.length && /\d/.test(dmgStr[i + 2])) {
            let j = i + 2;
            while (j < dmgStr.length && /\d/.test(dmgStr[j])) {
                j++;
            }
            result.push(`fx${dmgStr.substring(i + 2, j)}`);
            i = j;
        }
        // 处理卡片移动（支持DT>RS4:C+2和DT>RS4:C+2zj(2)格式）
        else if (i + 4 < dmgStr.length && 
                ["DT", "DB", "RS", "CL"].includes(dmgStr.substring(i, i + 2)) && 
                dmgStr[i + 2] === '>' && 
                ["DT", "DB", "RS", "CL"].includes(dmgStr.substring(i + 3, i + 5))) {
            
            let fromLoc = dmgStr.substring(i, i + 2);
            let toLoc = dmgStr.substring(i + 3, i + 5);
            let j = i + 5;
            
            // 处理数量
            let count = 1;
            if (j < dmgStr.length && /\d/.test(dmgStr[j])) {
                let countStart = j;
                while (j < dmgStr.length && /\d/.test(dmgStr[j])) {
                    j++;
                }
                count = parseInt(dmgStr.substring(countStart, j));
            }
            
            // 处理条件判断
            if (j < dmgStr.length && dmgStr[j] === ':') {
                if (j + 1 < dmgStr.length && ["C", "N"].includes(dmgStr[j + 1])) {
                    let condition = dmgStr[j + 1];
                    j += 2;
                    
                    // 处理+数字或+zj格式
                    if (j < dmgStr.length && dmgStr[j] === '+') {
                        j++;
                        
                        // 检查是简单数字还是zj格式
                        let actionStart = j;
                        let bracketCount = 0;
                        let k = j;
                        
                        // 处理简单数字或复杂表达式
                        while (k < dmgStr.length) {
                            if (dmgStr[k] === '(') {
                                bracketCount++;
                            } else if (dmgStr[k] === ')') {
                                bracketCount--;
                                if (bracketCount === 0) {
                                    k++;
                                    break;
                                }
                            } else if (bracketCount === 0 && (dmgStr[k] === ',' || k === dmgStr.length - 1)) {
                                if (k === dmgStr.length - 1) k++;
                                break;
                            }
                            k++;
                        }
                        
                        let actionStr = dmgStr.substring(actionStart, k);
                        let actionSeq = parseDamageSequence(actionStr);
                        result.push([`${fromLoc}>${toLoc}${count}:${condition}`, "zj", actionSeq]);
                        i = k;
                    }
                } else {
                    throw new Error('条件类型错误');
                }
            } else {
                // 简单移动
                result.push(`${fromLoc}>${toLoc}${count > 1 ? count : ''}`);
                i = j;
            }
        }
        // 处理区域内操作
        else if (i + 3 < dmgStr.length && 
                ["DT", "DB", "RS", "CL"].includes(dmgStr.substring(i, i + 2)) &&
                ["+", "-"].includes(dmgStr[i + 2]) &&
                ["N", "C"].includes(dmgStr[i + 3])) {
            let location = dmgStr.substring(i, i + 2);
            let operation = dmgStr[i + 2];
            let cardType = dmgStr[i + 3];
            result.push(`${location}${operation}${cardType}`);
            i += 4;
        }
        else {
            throw new Error(`未知字符: ${dmgStr[i]}`);
        }
    }
    
    return result;
}


export function formatDamageSeq(seq) {
    let result = [];
    for (let item of seq) {
        if (Array.isArray(item) && item.length === 3) {
            if (typeof item[0] === 'string' && item[0].includes(':')) {
                let [moveOp, effectType, zjSeq] = item;
                let subFormatted = formatDamageSeq(zjSeq);
                result.push(`${moveOp}+${effectType}(${subFormatted})`);
            } else {
                let [dmg, effectType, subSeq] = item;
                let subFormatted = formatDamageSeq(subSeq);
                if (effectType === 'szj') {
                    result.push(`*${dmg}zj(${subFormatted})`);
                } else {
                    result.push(`${dmg}${effectType}(${subFormatted})`);
                }
            }
        } else {
            result.push(String(item));
        }
    }
    return result.join(',');
}


export function performSimulation(D, N, R, RC, C, CC, damageSeq, drawCard) {
    let trials = 100000;
    let results = [];
    let refreshes = [];
    let levelUps = [];

    for (let trial = 0; trial < trials; trial++) {
        let deck = [];
        let rest = [];
        let clock = [];
        
        // 初始化卡组
        for (let i = 0; i < D - N; i++) deck.push('N');
        for (let i = 0; i < N; i++) deck.push('C');
        for (let i = 0; i < R - RC; i++) rest.push('N');
        for (let i = 0; i < RC; i++) rest.push('C');
        for (let i = 0; i < C - CC; i++) clock.push('N');
        for (let i = 0; i < CC; i++) clock.push('C');
        
        shuffleArray(deck);
        shuffleArray(rest);
        shuffleArray(clock);
        
        let refreshCount = 0;
        let totalDamage = 0;
        let levelUpCount = 0;

        function refreshDeck() {
            if (deck.length === 0) {
                if (rest.length === 0) return false;
                refreshCount++;
                deck = [...rest];
                rest = [];
                shuffleArray(deck);
                
                // 卡组更新时造成1点真实伤害
                if (deck.length > 0) {
                    let card = deck.pop();
                    clock.push(card);
                    totalDamage += 1;
                    checkLevelUp();
                }
                return true;
            }
            return true;
        }

        function checkLevelUp() {
            while (clock.length >= 7) {
                let levelCards = [];
                for (let i = 0; i < 7; i++) {
                    if (clock.length > 0) {
                        levelCards.push(clock.shift());
                    }
                }
                
                let levelUpCard = levelCards.find(card => card === 'N') || levelCards[0];
                let remainingCards = levelCards.filter(card => card !== levelUpCard);
                rest.push(...remainingCards);
                levelUpCount++;
            }
        }

        function processDamage(dmgItem) {
            if (typeof dmgItem === 'string') {
                // 处理fx
                if (dmgItem.startsWith('fx')) {
                    let num = parseInt(dmgItem.substring(2)) || 0;
                    refreshDeck();
                    checkLevelUp();
                    
                    let removed = 0;
                    for (let i = 0; i < rest.length && removed < num; i++) {
                        if (rest[i] === 'N') {
                            deck.push(rest.splice(i, 1)[0]);
                            removed++;
                            i--;
                        }
                    }
                    shuffleArray(deck);
                    return false;
                }
                
                // 处理卡片移动（支持DT>RS4:C+2和DT>RS4:C+2zj(2)格式）
                const match = dmgItem.match(/^([DT][TB]|[RS]|[CL])>([DT][TB]|[RS]|[CL])(\d*):([CN])\+(.+)$/);
                if (match) {
                    let [_, fromLoc, toLoc, countStr, condition, action] = match;
                    let count = countStr ? parseInt(countStr) : 1;
                    
                    refreshDeck();
                    
                    let movedCards = [];
                    let conditionMet = false;
                    
                    for (let c = 0; c < count; c++) {
                        let card = null;
                        
                        if (fromLoc === 'DT' && deck.length > 0) {
                            card = deck.shift();
                        } else if (fromLoc === 'DB' && deck.length > 0) {
                            card = deck.pop();
                        } else if (fromLoc === 'RS' && rest.length > 0) {
                            let idx = Math.floor(Math.random() * rest.length);
                            card = rest.splice(idx, 1)[0];
                        } else if (fromLoc === 'CL' && clock.length > 0) {
                            let idx = Math.floor(Math.random() * clock.length);
                            card = clock.splice(idx, 1)[0];
                            totalDamage--;
                        }
                        
                        if (card) {
                            movedCards.push(card);
                            if (card === condition) conditionMet = true;
                        }
                    }
                    
                    for (let card of movedCards) {
                        if (toLoc === 'DT') deck.unshift(card);
                        else if (toLoc === 'DB') deck.push(card);
                        else if (toLoc === 'RS') rest.push(card);
                        else if (toLoc === 'CL') {
                            clock.push(card);
                            totalDamage++;
                        }
                    }
                    
                    checkLevelUp();
                    
                    if (conditionMet) {
                        let actionSeq = parseDamageSequence(action);
                        for (let item of actionSeq) {
                            processDamage(item);
                        }
                    }
                    return false;
                }
                
                // 简单移动
                const moveMatch = dmgItem.match(/^([DT][TB]|[RS]|[CL])>([DT][TB]|[RS]|[CL])(\d*)$/);
                if (moveMatch) {
                    let [_, fromLoc, toLoc, countStr] = moveMatch;
                    let count = countStr ? parseInt(countStr) : 1;
                    
                    for (let c = 0; c < count; c++) {
                        let card = null;
                        
                        if (fromLoc === 'DT' && deck.length > 0) {
                            card = deck.shift();
                        } else if (fromLoc === 'DB' && deck.length > 0) {
                            card = deck.pop();
                        } else if (fromLoc === 'RS' && rest.length > 0) {
                            let idx = Math.floor(Math.random() * rest.length);
                            card = rest.splice(idx, 1)[0];
                        } else if (fromLoc === 'CL' && clock.length > 0) {
                            let idx = Math.floor(Math.random() * clock.length);
                            card = clock.splice(idx, 1)[0];
                            totalDamage--;
                        }
                        
                        if (card) {
                            if (toLoc === 'DT') deck.unshift(card);
                            else if (toLoc === 'DB') deck.push(card);
                            else if (toLoc === 'RS') rest.push(card);
                            else if (toLoc === 'CL') {
                                clock.push(card);
                                totalDamage++;
                            }
                        }
                    }
                    checkLevelUp();
                    return false;
                }
                
                // 处理区域内添加/移除
                const zoneMatch = dmgItem.match(/^([DT][TB]|[RS]|[CL])([+-])([NC])$/);
                if (zoneMatch) {
                    let [_, zone, op, type] = zoneMatch;
                    
                    if (op === '+') {
                        if (zone === 'DT') deck.unshift(type);
                        else if (zone === 'DB') deck.push(type);
                        else if (zone === 'RS') rest.push(type);
                        else if (zone === 'CL') {
                            clock.push(type);
                            totalDamage++;
                        }
                    } else if (op === '-') {
                        let tempArr;
                        if (zone === 'DT') tempArr = deck;
                        else if (zone === 'DB') tempArr = deck;
                        else if (zone === 'RS') tempArr = rest;
                        else if (zone === 'CL') {
                            tempArr = clock;
                            totalDamage--;
                        }
                        
                        let idx = tempArr.indexOf(type);
                        if (idx !== -1) {
                            tempArr.splice(idx, 1);
                        }
                    }
                    checkLevelUp();
                    return false;
                }
            }
            
            // 处理数字伤害或数组格式
            let damage = 0;
            let effectType = null;
            let effectSeq = [];
            
            if (Array.isArray(dmgItem)) {
                if (typeof dmgItem[0] === 'string' && dmgItem[0].includes(':')) {
                    // 条件判断操作
                    let [moveOp, effectType, effectSeq] = dmgItem;
                    let [movePart, conditionPart] = moveOp.split(':');
                    let [fromTo, countStr] = movePart.split('>');
                    let count = countStr ? parseInt(countStr.replace(/\D/g, '')) || 1 : 1;
                    let fromLoc = fromTo;
                    let toLoc = countStr ? countStr.replace(/\d/g, '') : '';
                    
                    refreshDeck();
                    
                    let movedCards = [];
                    let conditionMet = false;
                    
                    for (let c = 0; c < count; c++) {
                        let card = null;
                        
                        if (fromLoc === 'DT' && deck.length > 0) {
                            card = deck.shift();
                        } else if (fromLoc === 'DB' && deck.length > 0) {
                            card = deck.pop();
                        } else if (fromLoc === 'RS' && rest.length > 0) {
                            let idx = Math.floor(Math.random() * rest.length);
                            card = rest.splice(idx, 1)[0];
                        } else if (fromLoc === 'CL' && clock.length > 0) {
                            let idx = Math.floor(Math.random() * clock.length);
                            card = clock.splice(idx, 1)[0];
                            totalDamage--;
                        }
                        
                        if (card) {
                            movedCards.push(card);
                            if (card === conditionPart) conditionMet = true;
                        }
                    }
                    
                    for (let card of movedCards) {
                        if (toLoc === 'DT') deck.unshift(card);
                        else if (toLoc === 'DB') deck.push(card);
                        else if (toLoc === 'RS') rest.push(card);
                        else if (toLoc === 'CL') {
                            clock.push(card);
                            totalDamage++;
                        }
                    }
                    
                    checkLevelUp();
                    
                    if (conditionMet) {
                        for (let item of effectSeq) {
                            processDamage(item);
                        }
                    }
                    return false;
                } else {
                    [damage, effectType, effectSeq] = dmgItem;
                }
            } else {
                damage = dmgItem;
            }
            
            const processed = [];
            refreshDeck();
            
            for (let d = 0; d < damage; d++) {
                if (!refreshDeck() || deck.length === 0) break;
                
                let card = deck.pop();
                processed.push(card);
                
                if (card === 'C') {
                    // 伤害取消
                    rest.push(...processed);
                    
                    if (effectType === 'zj' || effectType === 'szj') {
                        for (let item of effectSeq) {
                            processDamage(item);
                        }
                    }
                    return false;
                }
            }
            
            // 完成所有伤害
            clock.push(...processed);
            totalDamage += processed.length;
            checkLevelUp();
            return true;
        }
        
        // 处理所有伤害项
        for (let dmgItem of damageSeq) {
            processDamage(dmgItem);
        }
        
        // 结束后抽牌
        if (drawCard) {
            refreshDeck();
            if (deck.length > 0) {
                clock.push(deck.pop());
                totalDamage++;
                checkLevelUp();
            }
        }
        
        results.push(totalDamage);
        refreshes.push(refreshCount);
        levelUps.push(levelUpCount);
    }
    
    simulationResults = results;
    refreshCounts = refreshes;
    levelUpCounts = levelUps;
    
}


/**
 * Run a simulation with the existing project's engine.
 * Returns the same structure as our simulator's SimOutput for comparison.
 */
export function runExisting(syntaxStr, D, N, R, RC, C, CC, trials = 100_000) {
  const damageSeq = parseDamageSequence(syntaxStr);

  // Temporarily override trials count inside performSimulation
  // performSimulation uses hardcoded 100_000; we patch it by running it directly
  // and scaling if needed. For now just call it.
  performSimulation(D, N, R, RC, C, CC, damageSeq, false);

  // performSimulation writes to global simulationResults / refreshCounts / levelUpCounts
  // (they are let vars in the original; we need to access them)
  // Since we extracted the functions as-is, the globals are in module scope.
  return buildOutput(simulationResults, refreshCounts, levelUpCounts);
}

function buildOutput(results, refreshes, levelUps) {
  const trials = results.length;
  if (trials === 0) return null;

  const sum = results.reduce((a, b) => a + b, 0);
  const mean = sum / trials;
  const min = Math.min(...results);
  const max = Math.max(...results);

  // Build probAtLeast for all integers min..max
  const freq = {};
  for (const v of results) freq[v] = (freq[v] ?? 0) + 1;

  const probAtLeast = {};
  let cumAbove = 1;
  for (let k = min; k <= max; k++) {
    probAtLeast[k] = cumAbove;
    cumAbove -= (freq[k] ?? 0) / trials;
  }

  const avgRefresh = refreshes.reduce((a, b) => a + b, 0) / trials;
  const avgLevelUp = levelUps.reduce((a, b) => a + b, 0) / trials;

  return { mean, min, max, probAtLeast, avgRefresh, avgLevelUp, trials };
}
