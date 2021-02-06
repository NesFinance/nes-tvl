import { initRCP, farmList, getPriceTokenFarm, setGraphQL } from './utils/functions'
import { masterChef } from './utils/configs'
import BigNumber from 'bignumber.js'

const serve = async () => {
    const _web3 = await initRCP()
    const _farms = await farmList()
    const farm = _farms.find((p: any) => p.pid === 1)
    const priceBNB_USD = new BigNumber(1).div((await getPriceTokenFarm(_web3, "0x1B96B92314C44b159149f7E0303511fB2Fc4774f", "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", 2, "0x73feaa1eE314F8c655E354234017bE2193C9E24E", "0x1B96B92314C44b159149f7E0303511fB2Fc4774f")).tokenPriceVsQuote)
    let priceToken = priceBNB_USD.times((await getPriceTokenFarm(_web3, farm.lp, farm.tokenA, farm.pid, masterChef, farm.tokenLP)).tokenPriceVsQuote)
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
