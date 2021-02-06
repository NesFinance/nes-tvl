import {initRCP, farmList, APY_TOKEN_BNB, getPriceTokenFarm, setGraphQL, farms_Staking, getPriceToken} from './utils/functions'
import {masterChef } from './utils/configs'
import BigNumber from 'bignumber.js'

const serve = async() => {
    const _web3 = await initRCP()
    const _farms = await farmList()
    const priceBNB_USD = new BigNumber(1).div((await getPriceTokenFarm(_web3, "0x1B96B92314C44b159149f7E0303511fB2Fc4774f", "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", 2, "0x73feaa1eE314F8c655E354234017bE2193C9E24E", "0x1B96B92314C44b159149f7E0303511fB2Fc4774f")).tokenPriceVsQuote)
    for (const k in _farms) {
        let d = _farms[k]

        if (d.from === "staking" && d.pid === 0) {
            let farm = null
            let pid = 0
            let tokenA = d.tokenA
            if(d.pid === 0){
                farm = _farms.filter((farm: any) => { return farm.pid == 1 })[0]
                pid = 1
            } else {
                farm = _farms.filter((farm: any) => { return farm.token == 'CAKE-BNB LP' })[0]
                pid = farm.pid
                tokenA = d.tokenLP
            }
            let data = await getPriceTokenFarm(_web3, farm.lp, farm.tokenA, pid, masterChef, farm.tokenLP)
            let priceToken = priceBNB_USD.times(data.tokenPriceVsQuote)
            let _data = null
            if(d.pid === 0){
                //return farmsLP_BNB(web3, lp, _token, pid, chef, tokenLP).then(async(r) => {
                let p = await getPriceToken(_web3, d.tokenA)
                //console.log(p)
                _data = await farms_Staking(_web3, d.tokenLP, d.tokenA, d.pid, masterChef, d.tokenLP)
            } else {

            }

            // console.log(priceToken.toString())
            // console.log(_data)
            // console.log(data)
            

        }

        if (d.from !== "staking" && d.pid !== 1000) {
            let data = await getPriceTokenFarm(_web3, d.lp, d.tokenA, d.pid, masterChef, d.tokenLP)
            let priceToken = priceBNB_USD.times(data.tokenPriceVsQuote)
            if( isNaN(parseFloat(priceToken.toString())) ){ priceToken = new BigNumber(0) }            
            let _data = null
            if(d.from === 'jetfuel'){
                _data = await APY_TOKEN_BNB(_web3, d.lp, d.tokenA, d.pid, masterChef, d.tokenLP, priceToken)
            } else if(d.from === 'cake'){
                _data = await APY_TOKEN_BNB(_web3, d.lp, d.tokenA, d.pid, masterChef, d.tokenLP, priceToken)
            } else {
                _data = await APY_TOKEN_BNB(_web3, d.tokenLP, d.tokenA, d.pid, masterChef, d.tokenLP, priceToken)
            }

            const v = _data

            await setGraphQL(`
                mutation {
                    updateAPY( pid:`+d.pid+`, apr:"`+v.apr+`", farmApy:"`+v.farmApy+`", roi1D:"`+v.roi1D+`", roi7D:"`+v.roi7D+`", roi30D:"`+v.roi30D+`", roi365D:"`+v.roi365D+`", cakeEarnedPerThousand1D:"`+v.cakeEarnedPerThousand1D+`", cakeEarnedPerThousand7D:"`+v.cakeEarnedPerThousand7D+`", cakeEarnedPerThousand30D:"`+v.cakeEarnedPerThousand30D+`", cakeEarnedPerThousand365D:"`+v.cakeEarnedPerThousand365D+`") {
                        pid
                    }
                }
            `)

        }

    }

    setTimeout(() => { serve() }, 35000)

}

serve()