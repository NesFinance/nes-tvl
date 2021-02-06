import axios from 'axios'
import Web3 from "web3"
import BigNumber from 'bignumber.js'
import abiToken from '../abi/Token'
import abiGBT from '../abi/Gbt'
import abiMembers from '../abi/Members'
import abiLottery from '../abi/Lottery'
import abiMasterChef from '../abi/MasterChef'
import abiCakeLP from '../abi/CakeLP'
import abiChefCake from '../abi/ChefCake'
import abiPair from '../abi/Pair'
import {configs, farms, wbnb, router, factory, cake_pool, jetfuel_pool, masterChef, usdt, token, multicallAddr, CAKE_PER_BLOCK, BLOCKS_PER_YEAR} from './configs'
import { ChainId, Token, Route, Pair, TokenAmount } from '@pancakeswap-libs/sdk'


import erc20 from '../abi/erc20.json'
import MultiCallAbi from '../abi/Multicall.json'
import masterchefABI from '../abi/masterchef.json'
import { AbiItem } from 'web3-utils'
import { Interface } from '@ethersproject/abi'


export const setGraphQL = async(data:any) => {
    try {
        await axios({
            url: 'http://localhost:80/graphql',
            method: 'post',
            data: {query: data}
          })
    } catch (error) {
        
    }
}

export const getFarmGraphQL = async(id:any) => {
    try {
        let d = await axios({
            url: 'http://localhost:80/graphql',
            method: 'post',
            data: {
                query: `
                {
                    farm(pid: `+id+`) {
                        pid
                        token
                        price
                        tvl
                        apy
                        apr
                        multiplier
                        tokenBalanceLP
                        quoteTokenBlanceLP    
                    }
                  }                
                `            
            }
          })
        return d.data
    } catch (error) {
        return null
    }
}

export const getRCP = async() => {
    try {
        const d = await axios.get(configs)
        return d.data.rcp
    } catch (error) {
        return null
    }    
}

export const initRCP = async() => {
    try {
        const d = await axios.get(configs)
        const w = new Web3(d.data.rcp)
        //const w = new Web3("https://bsc-dataseed1.ninicoin.io")
        return w
    } catch (error) {
        return null
    }    
}

export const farmList = async() => {
    try {
        const d = await axios.get(farms)
        return d.data
    } catch (error) {
        return null
    }
}

export const getPriceToken = async(w:any , _token:any) => {
    let priceGlobal = 0
    const TOKEN = new Token(ChainId.MAINNET, _token, 18)
    const WBNB = new Token(ChainId.MAINNET, wbnb, 18)
    const address = Pair.getAddress(TOKEN, WBNB)
    const farmPrice = new w.eth.Contract(abiPair, address)
    await farmPrice.methods.getReserves().call().then(async(r:any) => {
        let reserves0 = r._reserve0
        let reserves1 = r._reserve1
        const balances = TOKEN.sortsBefore(WBNB) ? [reserves0, reserves1] : [reserves1, reserves0]
        const prices = new Pair(new TokenAmount(TOKEN, balances[0]), new TokenAmount(WBNB, balances[1]))
        const route = new Route([prices], WBNB)
        let price:any = route.midPrice.invert().toSignificant(8)
        const USDT = new Token(ChainId.MAINNET, usdt, 18)
        const addressUSDT = Pair.getAddress(WBNB, USDT)
        const farmPriceUSDT = new w.eth.Contract(abiPair, addressUSDT)
        await farmPriceUSDT.methods.getReserves().call().then(async(r:any) => {
            let reserves0_USDT = r._reserve0
            let reserves1_USDT = r._reserve1
            const balances_USDT = USDT.sortsBefore(WBNB) ? [reserves0_USDT, reserves1_USDT] : [reserves1_USDT, reserves0_USDT]
            const prices_USDT = new Pair(new TokenAmount(USDT, balances_USDT[0]), new TokenAmount(WBNB, balances_USDT[1]))
            const route_USDT:any = new Route([prices_USDT], WBNB)
            let price_USDT = 1 / route_USDT.midPrice.invert().toSignificant(8)
            let priceToken = price_USDT * price
            priceGlobal = priceToken
        })
    })
    return priceGlobal
}

interface Call {
    address: string // Address of the contract
    name: string // Function name on the contract (exemple: balanceOf)
    params?: any[] // Function params
  }

export const multicall = async (web3:any, abi: any[], calls: Call[]) => {
    const multi = new web3.eth.Contract((MultiCallAbi as unknown) as AbiItem, multicallAddr)
    const itf = new Interface(abi)
    const calldata = calls.map((call) => [call.address.toLowerCase(), itf.encodeFunctionData(call.name, call.params)])
    const { returnData } = await multi.methods.aggregate(calldata).call()
    const res = returnData.map((call:any, i:any) => itf.decodeFunctionResult(calls[i].name, call))
    return res    
}



const roundToTwoDp = (number:any) => Math.round(number * 100) / 100


export const calculateCakeEarnedPerThousandDollars = ( numberOfDays:any, farmApy:any, cakePrice:any ) => {
    // Everything here is worked out relative to a year, with the asset compounding daily
    const timesCompounded = 365
    //   We use decimal values rather than % in the math for both APY and the number of days being calculates as a proportion of the year
    const apyAsDecimal = farmApy / 100
    const daysAsDecimalOfYear = numberOfDays / timesCompounded
    //   Calculate the starting CAKE balance with a dollar balance of $1000.
    const principal = 1000 / cakePrice
  
    // This is a translation of the typical mathematical compounding APY formula. Details here: https://www.calculatorsoup.com/calculators/financial/compound-interest-calculator.php
    const finalAmount = principal * (1 + apyAsDecimal / timesCompounded) ** (timesCompounded * daysAsDecimalOfYear)
  
    // To get the cake earned, deduct the amount after compounding (finalAmount) from the starting CAKE balance (principal)
    const interestEarned = finalAmount - principal
    return roundToTwoDp(interestEarned)
  }


  export const apyModalRoi = ( amountEarned:any, amountInvested:any ) => {
    const percentage = (amountEarned / amountInvested) * 100
    return percentage.toFixed(2)
  }
  
  
  export const balanceTokenChef = async(web3:any, _token:any, pid:any) => {
    const calls = [
        {
          address: _token,
          name: 'balanceOf',
          params: [masterChef],
        }
      ]

      const [balance] = await multicall(web3, erc20, calls)      

      const [info] = await multicall(web3, masterchefABI, [
        {
          address: masterChef,
          name: 'poolInfo',
          params: [pid],
        }
      ])

      const allocPoint = new BigNumber(info.allocPoint._hex)

      return {
          balance: balance.balance._hex,
          multiplier: `${allocPoint.div(100).toString()}`,
      }

  }

  export const getPriceTokenFarm = async(web3:any, lp:any, token:any, pid:any, mChef:any, tokenLP:any) => {
    return await farmsLP_BNB(web3, lp, token, pid, mChef, tokenLP)
  }

  export const farms_Staking = async(web3:any, lp:any, token:any, pid:any, mChef:any, tokenLP:any) => {


  }

  export const farmsLP_BNB = async(web3:any, lp:any, token:any, pid:any, mChef:any, tokenLP:any) => {

    const lpAdress = lp
    const calls = [
      // Balance of token in the LP contract
      {
        address: token,
        name: 'balanceOf',
        params: [lpAdress],
      },
      // Balance of quote token on LP contract
      {
        address: wbnb,
        name: 'balanceOf',
        params: [lpAdress],
      },
      // Balance of LP tokens in the master chef contract
      {
        address: tokenLP,
        name: 'balanceOf',
        params: [mChef],
      },
      // Total supply of LP tokens
      {
        address: lpAdress,
        name: 'totalSupply',
      },
      // Token decimals
      {
        address: token,
        name: 'decimals',
      },
      // Quote token decimals
      {
        address: wbnb,
        name: 'decimals',
      },
    ]
    
    const [
        tokenBalanceLP,
        quoteTokenBlanceLP,
        lpTokenBalanceMC,
        lpTotalSupply,
        tokenDecimals,
        quoteTokenDecimals,
      ] = await multicall(web3, erc20, calls)

      
      const lpTokenRatio = new BigNumber(lpTokenBalanceMC).div(new BigNumber(lpTotalSupply))
      const lpTotalInQuoteToken = new BigNumber(quoteTokenBlanceLP).div(new BigNumber(10).pow(18)).times(new BigNumber(2)).times(lpTokenRatio)
      const tokenAmount = new BigNumber(tokenBalanceLP).div(new BigNumber(10).pow(tokenDecimals)).times(lpTokenRatio)
      const quoteTokenAmount = new BigNumber(quoteTokenBlanceLP).div(new BigNumber(10).pow(quoteTokenDecimals)).times(lpTokenRatio)


    //   console.log("tokenBalanceLP : " + (tokenBalanceLP.toString()))
    //   console.log("tokenDecimals : " + (tokenDecimals.toString()))
    //   console.log("lpTokenRatio : " + (lpTokenRatio.toString()))
    //   console.log("quoteTokenBlanceLP : " + (quoteTokenBlanceLP.toString()))

      



    //   console.log("quoteTokenAmount : " + (quoteTokenAmount.toString()))
    //   console.log("tokenAmount : " + (tokenAmount.toString()))
      
      


      const [info, totalAllocPoint] = await multicall(web3, masterchefABI, [
        {
          address: mChef,
          name: 'poolInfo',
          params: [pid],
        },
        {
          address: mChef,
          name: 'totalAllocPoint',
        },
      ])

      const allocPoint = new BigNumber(info.allocPoint._hex)
      const poolWeight = allocPoint.div(new BigNumber(totalAllocPoint))

    //   console.log("------")
    //   console.log((tokenBalanceLP.toString()))
    //   console.log((quoteTokenBlanceLP.toString()))
    //   console.log("------")
    //   console.log((lpTokenBalanceMC.toString()))
    //   console.log((lpTotalSupply.toString()))
    //   console.log((tokenDecimals.toString()))
    //   console.log((quoteTokenDecimals.toString()))

    //    console.log("------oo")

    //   console.log((lpTokenRatio.toString()))
    //   console.log((lpTotalInQuoteToken.toString()))
    //   console.log((tokenAmount.toString()))
    //   console.log((quoteTokenAmount.toString()))

    //   console.log("------")

    //   console.log(info)
    //   console.log("totalAllocPoint : " + (totalAllocPoint.toString()))
    //   console.log("allocPoint : " + (allocPoint.toString()))
    //   console.log("poolWeight : " + (poolWeight.toString()))
      
      return {
        tokenAmount: tokenAmount.toJSON(),
        quoteTokenAmount: quoteTokenAmount.toJSON(),
        lpTotalInQuoteToken: lpTotalInQuoteToken.toJSON(),
        tokenPriceVsQuote: quoteTokenAmount.div(tokenAmount).toJSON(),
        poolWeight: poolWeight.toJSON(),
        multiplier: `${allocPoint.div(100).toString()}X`,
        tokenBalanceLP: new BigNumber(tokenBalanceLP.balance._hex).toJSON(),
        quoteTokenBlanceLP: new BigNumber(quoteTokenBlanceLP.balance._hex).toJSON()
      }
      
}




export const APY_TOKEN_BNB = async(web3:any, lp:any, _token:any, pid:any, chef:any, tokenLP:any, price:any) => {

    return farmsLP_BNB(web3, lp, _token, pid, chef, tokenLP).then(async(r) => {


        // console.log(r)

        const cakeRewardPerBlock = CAKE_PER_BLOCK.times(r.poolWeight)
        const cakeRewardPerYear = cakeRewardPerBlock.times(BLOCKS_PER_YEAR)
        let apy =  new BigNumber(r.tokenPriceVsQuote).times(cakeRewardPerYear).div(r.lpTotalInQuoteToken)



        // console.log("cakeRewardPerBlock : " + (cakeRewardPerBlock.toString()))
        // console.log("cakeRewardPerYear : " + (cakeRewardPerYear.toString()))
        // console.log("tokenPriceVsQuote : " + (r.tokenPriceVsQuote.toString()))
        // console.log("lpTotalInQuoteToken : " + (r.lpTotalInQuoteToken.toString()))
        
        

        const farmApy = apy.times(new BigNumber(100)).toNumber()
        let cakePrice = price

        



        const oneThousandDollarsWorthOfCake = 1000 / cakePrice.toNumber()

        const cakeEarnedPerThousand1D = calculateCakeEarnedPerThousandDollars( 1, farmApy, cakePrice )
        const cakeEarnedPerThousand7D = calculateCakeEarnedPerThousandDollars( 7, farmApy, cakePrice )
        const cakeEarnedPerThousand30D = calculateCakeEarnedPerThousandDollars( 30, farmApy, cakePrice )
        const cakeEarnedPerThousand365D = calculateCakeEarnedPerThousandDollars( 365, farmApy, cakePrice )

        const roi1D = apyModalRoi(cakeEarnedPerThousand1D, oneThousandDollarsWorthOfCake )
        const roi7D = apyModalRoi(cakeEarnedPerThousand7D, oneThousandDollarsWorthOfCake )
        const roi30D = apyModalRoi(cakeEarnedPerThousand30D, oneThousandDollarsWorthOfCake )
        const roi365D = apyModalRoi(cakeEarnedPerThousand365D, oneThousandDollarsWorthOfCake )
        
        // console.log("------")
        // console.log((cakePrice.toString()))

        // console.log("------")
        // console.log((cakeRewardPerBlock.toString()))
        // console.log((cakeRewardPerYear.toString()))
        // console.log((apy.toString()))

        // console.log("------")
        // console.log((farmApy.toString()))
        // console.log((cakePrice.toString()))
        
        // console.log("------")
        // console.log((cakeEarnedPerThousand1D.toString()))
        // console.log((cakeEarnedPerThousand7D.toString()))
        // console.log((cakeEarnedPerThousand30D.toString()))
        // console.log((cakeEarnedPerThousand365D.toString()))
        
        // console.log("------")
        // console.log((roi1D.toString()))
        // console.log((roi7D.toString()))
        // console.log((roi30D.toString()))
        // console.log((roi365D.toString()))

        return {
            apr: apy.toJSON(),
            farmApy: farmApy,
            roi1D: roi1D,
            roi7D: roi7D,
            roi30D: roi30D,
            roi365D: roi365D,
            cakeEarnedPerThousand1D: cakeEarnedPerThousand1D,
            cakeEarnedPerThousand7D: cakeEarnedPerThousand7D,
            cakeEarnedPerThousand30D: cakeEarnedPerThousand30D,
            cakeEarnedPerThousand365D: cakeEarnedPerThousand365D,
            
            
            
            
        }

    })

}