import React, { useState} from 'react';
import seedrandom from 'seedrandom';


function PickPacks() {

    const [totalPacks, setTotalPacks] = useState('');
    const [openPacks, setOpenPacks] = useState('');
    const [seed, setSeed] = useState('');
    const [results, setResults] = useState([]);
    

    const randomGeneratePacks = () => {
        const total = parseInt(totalPacks);
        const open = parseInt(openPacks);
        
        const currentDate = new Date().getTime();
        const timestamp = new Date('2001-12-11').getTime();
        const differenceSeed = currentDate - timestamp;
        setSeed(differenceSeed);

        if (open > total || isNaN(total) || isNaN(open) || total <= 0 || open <= 0) {
            alert("请输入有效的包数");
            return;
        }

        const rng = seedrandom(seed.toString());
        const available = new Set(Array.from({ length: total }, (_, i) => i + 1));
        const selected = [];

        while (selected.length < open) {
            const index = Math.floor(rng() * available.size);
            const value = Array.from(available)[index];
            available.delete(value);
            selected.push(value);
        }

        selected.sort((a, b) => a - b);
        setResults(selected);
    };

    return (
        <div className='container-fluid'>
            <div className = 'd-flex justify-content-center align-items-center flex-column mb-4'>
                <h1>随机开包</h1>
                <p>请输入总包数和开启的包数，系统默认自带提前设计好的神秘种子</p>
            </div>

            <div className='d-flex justify-content-center align-items-center mb-4 gap-3'>
                <input
                    type="number"
                    className="form-control w-100"
                    placeholder="开启包数"
                    value={openPacks}
                    onChange={(e) => setOpenPacks(e.target.value)}
                />
                <input
                    type="number"
                    className="form-control w-100"
                    placeholder="总包数"
                    value={totalPacks}
                    onChange={(e) => setTotalPacks(e.target.value)}
                />
            </div>
            <div className='d-flex justify-content-center align-items-center mb-4'>
                <button className="btn btn-primary btn-lg col-4" onClick={randomGeneratePacks}>开包</button>
            </div>
            {results.length > 0 && (
                <div className='d-flex justify-content-center align-items-center flex-column mb-4'>
                    <h3>已选择的包:</h3>
                        {results.map((pack) => (
                            <p key={pack}>{pack}</p>
                        ))}
                </div>
            )}
            
        </div>
    );
}

export default PickPacks;