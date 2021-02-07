import {masterChef, wbnb, busd} from './utils/configs'
import {initRCP, farmList, setGraphQL} from './utils/functions'
import BigNumber from 'bignumber.js'
import { BNBtoBUSD, priceGeneral_BNB , balanceTokenInChef, getMultiplier, balanceTokenLP, priceTokenForBNB} from './utils/prices'

const serve = async() => {
    const _web3 = await initRCP()
    const _farms = await farmList()
    const priceBNB_USD = await BNBtoBUSD(_web3)
    for (const k in _farms) {
        let d = _farms[k]
        let tokenBalanceLP = new BigNumber(0)
        let multiplier = new BigNumber(0)
        let priceToken = new BigNumber(0)
        let tvl = new BigNumber(0)
        multiplier = await getMultiplier(_web3, d.pid)
        if( isNaN(parseFloat(multiplier.toString())) ){
            multiplier = new BigNumber(0)
        }
        if (d.from === "staking" && d.type === "own___") {
            const farm = _farms.filter((farm: any) => { return farm.pid == 1 })[0]
            priceToken = priceBNB_USD.times((await priceGeneral_BNB(_web3, farm.lp, farm.tokenA, farm.pid, masterChef, farm.tokenLP)).tokenPriceVsQuote)
            if( isNaN(parseFloat(priceToken.toString())) ){
                priceToken = new BigNumber(0)
            }
            tokenBalanceLP = await balanceTokenInChef(_web3, masterChef, d.tokenA)
            if( isNaN(parseFloat(tokenBalanceLP.toString())) ){
                tokenBalanceLP = new BigNumber(0)
            }
            tvl = priceToken.times(tokenBalanceLP)
        }
        if (d.from === "staking" && d.type === "other___") {
            const farm = _farms.filter((farm: any) => { return farm.token == 'CAKE-BNB LP' })[0]
            priceToken = priceBNB_USD.times((await priceGeneral_BNB(_web3, farm.lp, farm.tokenA, farm.pid, masterChef, farm.tokenLP)).tokenPriceVsQuote)
            if( isNaN(parseFloat(priceToken.toString())) ){
                priceToken = new BigNumber(0)
            }
            tokenBalanceLP = await balanceTokenInChef(_web3, masterChef, d.tokenLP)
            if( isNaN(parseFloat(tokenBalanceLP.toString())) ){
                tokenBalanceLP = new BigNumber(0)
            }
            tvl = priceToken.times(tokenBalanceLP)
        }
        if (d.from === "own" && d.type === "own") {
            priceToken = priceBNB_USD.times((await priceGeneral_BNB(_web3, d.lp, d.tokenA, d.pid, masterChef, d.tokenLP)).tokenPriceVsQuote)
            if( isNaN(parseFloat(priceToken.toString())) ){
                priceToken = new BigNumber(0)
            }
            tokenBalanceLP = await balanceTokenInChef(_web3, masterChef, d.tokenLP)
            let balancesLPS = await balanceTokenLP(_web3, d.tokenLP, d.tokenA, d.tokenB)
            const priceTokenA = balancesLPS.balanceA.times(priceToken)
            const priceTokenB = balancesLPS.balanceB.times(priceBNB_USD)
            const totalSupply = balancesLPS.totalSupply
            const tvlGlobal = priceTokenA.plus(priceTokenB)
            const lpXusd = tvlGlobal.div(totalSupply)
            tvl = tokenBalanceLP.times(lpXusd)
            console.log(tvl.toJSON())
        }
        if (d.from !== "staking" && d.type === "other____" && d.tokenB.toLowerCase() === wbnb.toLowerCase() && d.pid !== 4000) {
            const dataPrice = await priceTokenForBNB(_web3, d.tokenA)
            priceToken = priceBNB_USD.times(dataPrice)
            if( isNaN(parseFloat(priceToken.toString())) ){
                priceToken = new BigNumber(0)
            }
            tokenBalanceLP = await balanceTokenInChef(_web3, masterChef, d.tokenLP)
            let balancesLPS = await balanceTokenLP(_web3, d.lp, d.tokenA, d.tokenB)
            const priceTokenA = balancesLPS.balanceA.times(priceToken)
            const priceTokenB = balancesLPS.balanceB.times(priceBNB_USD)
            const totalSupply = balancesLPS.totalSupply
            const tvlGlobal = priceTokenA.plus(priceTokenB)
            const lpXusd = tvlGlobal.div(totalSupply)
            tvl = tokenBalanceLP.times(lpXusd)
        }
        if (d.from !== "staking" && d.type === "other___" && d.tokenB.toLowerCase() === busd.toLowerCase() && d.pid !== 1700) {
            const dataPrice = await priceTokenForBNB(_web3, d.tokenA)
            priceToken = priceBNB_USD.times(dataPrice)
            if( isNaN(parseFloat(priceToken.toString())) ){
                priceToken = new BigNumber(0)
            }
            tokenBalanceLP = await balanceTokenInChef(_web3, masterChef, d.tokenLP)
            let balancesLPS = await balanceTokenLP(_web3, d.lp, d.tokenA, d.tokenB)
            const priceTokenA = balancesLPS.balanceA.times(priceToken)
            const priceTokenB = balancesLPS.balanceB.times(1)
            const totalSupply = balancesLPS.totalSupply
            const tvlGlobal = priceTokenA.plus(priceTokenB)
            const lpXusd = tvlGlobal.div(totalSupply)
            tvl = tokenBalanceLP.times(lpXusd)
        }
        if( isNaN(parseFloat(tvl.toString())) ){
            tvl = new BigNumber(0)
        }
        await setGraphQL(`
            mutation {
                updateTVL( pid:`+d.pid+`, tvl:`+tvl.toJSON()+`, tokenBalanceLP: "`+tokenBalanceLP+`", quoteTokenBlanceLP: "`+0+`", multiplier: "`+parseFloat(multiplier.toJSON())+`") {
                    pid
                }
                updatePrice( pid:`+d.pid+`, price:`+priceToken.toJSON()+`) {
                    pid
                    price
                }                    
            }
        `)
    }
    setTimeout(() => { serve() }, 5000)
}

serve()