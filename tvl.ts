import {masterChef} from './utils/configs'
import {initRCP, farmList, getPriceTokenFarm, setGraphQL, balanceTokenChef} from './utils/functions'
import BigNumber from 'bignumber.js'

const serve = async() => {
    const _web3 = await initRCP()
    const _farms = await farmList()
    const priceBNB_USD = new BigNumber(1).div((await getPriceTokenFarm(_web3, "0x1B96B92314C44b159149f7E0303511fB2Fc4774f", "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", 2, "0x73feaa1eE314F8c655E354234017bE2193C9E24E", "0x1B96B92314C44b159149f7E0303511fB2Fc4774f")).tokenPriceVsQuote)
    for (const k in _farms) {
        let d = _farms[k]
        if (d.from === "staking") {
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
            const {balance, multiplier} = await balanceTokenChef(_web3, tokenA, d.pid)
            let tokenBalanceLP = new BigNumber(balance).div(new BigNumber(10).pow(18))
            let tvl = new BigNumber(priceToken).times(tokenBalanceLP)

            if( isNaN(parseFloat(tvl.toString())) ){
                tvl = new BigNumber(0)
            }
            if( isNaN(parseFloat(tokenBalanceLP.toString())) ){
                tokenBalanceLP = new BigNumber(0)
            }

            await setGraphQL(`
                mutation {
                    updateTVL( pid:`+d.pid+`, tvl:`+tvl.toJSON()+`, tokenBalanceLP: "`+tokenBalanceLP+`", quoteTokenBlanceLP: "`+0+`", multiplier: "`+parseInt(multiplier)+`") {
                        pid
                    }
                    updatePrice( pid:`+d.pid+`, price:`+priceToken.toJSON()+`) {
                        pid
                        price
                    }                    
                }
            `)
            
        }
        if (d.from !== "staking") {
            let data = await getPriceTokenFarm(_web3, d.lp, d.tokenA, d.pid, masterChef, d.tokenLP)
            let priceToken = priceBNB_USD.times(data.tokenPriceVsQuote)
            const liqTokenA = new BigNumber(priceToken).times(data.tokenBalanceLP)
            const liqTokenB = new BigNumber(priceBNB_USD).times(data.quoteTokenBlanceLP)
            let tvl = new BigNumber(liqTokenA).plus(liqTokenB)
            tvl = tvl.div(new BigNumber(10).pow(18))
            let tokenBalanceLP = new BigNumber(data.tokenBalanceLP).div(new BigNumber(10).pow(18))
            let quoteTokenBlanceLP = new BigNumber(data.quoteTokenBlanceLP).div(new BigNumber(10).pow(18))
            
            if( isNaN(parseFloat(tvl.toString())) ){
                tvl = new BigNumber(0)
            }
            if( isNaN(parseFloat(tokenBalanceLP.toString())) ){
                tokenBalanceLP = new BigNumber(0)
            }
            if( isNaN(parseFloat(quoteTokenBlanceLP.toString())) ){
                quoteTokenBlanceLP = new BigNumber(0)
            }
            if( isNaN(parseFloat(priceToken.toString())) ){
                priceToken = new BigNumber(0)
            }

            await setGraphQL(`
                mutation {
                    updateTVL( pid:`+d.pid+`, tvl:`+tvl.toJSON()+`, tokenBalanceLP: "`+tokenBalanceLP+`", quoteTokenBlanceLP: "`+quoteTokenBlanceLP+`", multiplier: "`+parseInt(data.multiplier)+`") {
                        pid
                    }
                    updatePrice( pid:`+d.pid+`, price:`+priceToken.toJSON()+`) {
                        pid
                        price
                    }
                }
            `)

        }
    }
    setTimeout(() => { serve() }, 15000)
}

serve()