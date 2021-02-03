import {usdt} from './utils/configs'
import {initRCP, farmList, getTVLUSDT, insertDB, getTVL, getStakingTVL, initFirebase, insertTVL} from './utils/functions'

const serve = async() => {
    initFirebase().then(async(db) => {
        if(db !== null){
            initRCP().then(async(web3) => {
                if(web3 !== null){
                    farmList().then(async(farms) => {
                        if(farms !== null){
                            let total = 0
                            for (const k in farms) {
                                let d = farms[k]
                                if (d.tokenA === usdt) {
                                    let t = parseFloat(await getTVLUSDT(web3, d.lp, d.tokenA, d.tokenB, d.tokenLP, d.type, d.from))
                                    await insertDB(db, d.pid, t)
                                    total += t
                                } else if (d.from !== "staking") {
                                    let t = parseFloat(await getTVL(web3, d.lp, d.tokenA, d.tokenB, d.tokenLP, d.type, d.from))
                                    await insertDB(db, d.pid, t)
                                    total += t
                                } else {
                                    let t = (await getStakingTVL(web3, d.lp, d.tokenA, d.tokenB, d.tokenLP, d.type, d.from))
                                    await insertDB(db, d.pid, t)
                                    total += t
                                }
                            }
                            await insertTVL(db, total)
                            setTimeout(() => {
                                serve() 
                            }, 30000);
                        }
                    })
                }
            })
        }
    })
}

serve()
