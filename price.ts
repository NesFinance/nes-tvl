import { initRCP, farmList, setGraphQL } from './utils/functions'
import { masterChef } from './utils/configs'
import { BNBtoBUSD, priceGeneral_BNB } from './utils/prices'
import BigNumber from 'bignumber.js'

const serve = async () => {
    const _web3 = await initRCP()
    const _farms = await farmList()
    const farm = _farms.find((p: any) => p.pid === 1)
    const priceBNB_USD = await BNBtoBUSD(_web3)
    let priceToken = priceBNB_USD.times((await priceGeneral_BNB(_web3, farm.lp, farm.tokenA, farm.pid, masterChef, farm.tokenLP)).tokenPriceVsQuote)
    if( isNaN(parseFloat(priceToken.toString())) ){
        priceToken = new BigNumber(0)
    }
    await setGraphQL(`
        mutation {
            updatePrice( pid:0, price:`+priceToken.toJSON()+`) {
                pid
                price
            }
        }
    `)
    setTimeout(() => { serve() }, 10000)
}

serve()
