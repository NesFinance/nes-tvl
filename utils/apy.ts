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
import {multicall} from './multicall'



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


export const getApyOtherLP = async(web3:any, lp:any, tokenA:any, tokenB:any, pid:any, chef:any, tokenLP:any, price:any) => {
    const calls = [
        // Balance of token in the LP contract
        {
          address: tokenA,
          name: 'balanceOf',
          params: [lp],
        },
        // Balance of quote token on LP contract
        {
          address: tokenB,
          name: 'balanceOf',
          params: [lp],
        },
        // Balance of LP tokens in the master chef contract
        {
          address: tokenLP,
          name: 'balanceOf',
          params: [chef],
        },
        // Total supply of LP tokens
        {
          address: lp,
          name: 'totalSupply',
        },
        // Token decimals
        {
          address: tokenA,
          name: 'decimals',
        },
        // Quote token decimals
        {
          address: tokenB,
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

      const [info, totalAllocPoint] = await multicall(web3, masterchefABI, [
        {
          address: chef,
          name: 'poolInfo',
          params: [pid],
        },
        {
          address: chef,
          name: 'totalAllocPoint',
        },
      ])
      const allocPoint = new BigNumber(info.allocPoint._hex)
      const poolWeight = allocPoint.div(new BigNumber(totalAllocPoint))

      console.log("\n\n---Valores Iniciales multicall---")
      console.log("tokenBalanceLP : " + tokenBalanceLP.toString())
      console.log("quoteTokenBlanceLP : " + quoteTokenBlanceLP.toString())
      console.log("lpTokenBalanceMC : " + lpTokenBalanceMC.toString())
      console.log("lpTotalSupply : " + lpTotalSupply.toString())
      console.log("tokenDecimals : " + tokenDecimals.toString())
      console.log("quoteTokenDecimals : " + quoteTokenDecimals.toString())

      console.log("\n\n---Valores Iniciales multicall---")
      console.log("lpTokenRatio : " + lpTokenRatio.toString())
      console.log("lpTotalInQuoteToken : " + lpTotalInQuoteToken.toString())
      console.log("tokenAmount : " + tokenAmount.toString())
      console.log("quoteTokenAmount : " + quoteTokenAmount.toString())

      console.log("\n\n---Puntos de collocacion multicall---")
      console.log("allocPoint : " + allocPoint.toString())
      console.log("poolWeight : " + poolWeight.toString())

      console.log("\n\n---Retorno de valores getApyOtherLP---")

      return {
        tokenAmount: tokenAmount.toJSON(),
        quoteTokenAmount: quoteTokenAmount.toJSON(),
        lpTotalInQuoteToken: lpTotalInQuoteToken.toJSON(),
        tokenPriceVsQuote: quoteTokenAmount.div(tokenAmount).toJSON(),
        poolWeight: poolWeight.toJSON(),
        multiplier: `${allocPoint.div(100).toString()}X`,
        tokenBalanceLP: new BigNumber(tokenBalanceLP.balance._hex).toJSON(),
        quoteTokenBlanceLP: new BigNumber(quoteTokenBlanceLP.balance._hex).toJSON(),
        price: new BigNumber(price).toJSON()
      }      
      
}
 
export const apyBNBConvert = async(data:any) => {
    const cakeRewardPerBlock = CAKE_PER_BLOCK.times(data.poolWeight)
    const cakeRewardPerYear = cakeRewardPerBlock.times(BLOCKS_PER_YEAR)
    let apr =  new BigNumber(data.tokenPriceVsQuote).times(cakeRewardPerYear).div(data.lpTotalInQuoteToken)

    const farmApy = apr.times(new BigNumber(100)).toNumber()
    let cakePrice = new BigNumber(data.price)


    const oneThousandDollarsWorthOfCake = 1000 / cakePrice.toNumber()

    const cakeEarnedPerThousand1D = calculateCakeEarnedPerThousandDollars( 1, farmApy, cakePrice )
    const cakeEarnedPerThousand7D = calculateCakeEarnedPerThousandDollars( 7, farmApy, cakePrice )
    const cakeEarnedPerThousand30D = calculateCakeEarnedPerThousandDollars( 30, farmApy, cakePrice )
    const cakeEarnedPerThousand365D = calculateCakeEarnedPerThousandDollars( 365, farmApy, cakePrice )

    const roi1D = apyModalRoi(cakeEarnedPerThousand1D, oneThousandDollarsWorthOfCake )
    const roi7D = apyModalRoi(cakeEarnedPerThousand7D, oneThousandDollarsWorthOfCake )
    const roi30D = apyModalRoi(cakeEarnedPerThousand30D, oneThousandDollarsWorthOfCake )
    const roi365D = apyModalRoi(cakeEarnedPerThousand365D, oneThousandDollarsWorthOfCake )


    console.log("\n\n---Valores Iniciales apyBNBConvert---")
    console.log(data)

    console.log("\n\n---APR Reward per block---")
    console.log("cakeRewardPerBlock : " + cakeRewardPerBlock.toString())
    console.log("cakeRewardPerYear : " + cakeRewardPerYear.toString())
    console.log("apr : " + apr.toString())
    
    console.log("\n\n---farmApy and price---")
    console.log("farmApy : " + farmApy.toString())
    console.log("cakePrice : " + cakePrice.toString())

    console.log("\n\n---oneThousandDollarsWorthOfCake---")
    console.log("oneThousandDollarsWorthOfCake : " + oneThousandDollarsWorthOfCake.toString())


    console.log("\n\n---oneThousandDollarsWorthOfCake---")
    console.log("oneThousandDollarsWorthOfCake : " + oneThousandDollarsWorthOfCake.toString())

    
    console.log("\n\n---cakeEarnedPerThousand 1000 usd---")
    console.log("cakeEarnedPerThousand1D : " + cakeEarnedPerThousand1D.toString())
    console.log("cakeEarnedPerThousand7D : " + cakeEarnedPerThousand7D.toString())
    console.log("cakeEarnedPerThousand30D : " + cakeEarnedPerThousand30D.toString())
    console.log("cakeEarnedPerThousand365D : " + cakeEarnedPerThousand365D.toString())
    
    console.log("\n\n---ROI---")
    console.log("roi1D : " + roi1D.toString())
    console.log("roi7D : " + roi7D.toString())
    console.log("roi30D : " + roi30D.toString())
    console.log("roi365D : " + roi365D.toString())


    return {
        apr: apr.toJSON(),
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

}