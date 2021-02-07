
import BigNumber from 'bignumber.js'
import abiPair from '../abi/Pair'
import {wbnb, masterChef} from './configs'
import { ChainId, Token, Route, Pair, TokenAmount } from '@pancakeswap-libs/sdk'
import {multicall} from './multicall'
import erc20 from '../abi/erc20.json'
import masterchefABI from '../abi/masterchef.json'

export const BNBtoBUSD = async(web3:any) => {
    return new BigNumber(1).div((await priceGeneral_BNB(web3, "0x1B96B92314C44b159149f7E0303511fB2Fc4774f", "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", 2, "0x73feaa1eE314F8c655E354234017bE2193C9E24E", "0x1B96B92314C44b159149f7E0303511fB2Fc4774f")).tokenPriceVsQuote)
}

export const balanceTokenInChef = async(web3:any, chef:any, token:any) => {
    const calls = [
        {
          address: token,
          name: 'balanceOf',
          params: [chef],
        }
      ]
      const [balance] = await multicall(web3, erc20, calls)
      return new BigNumber(balance.balance._hex).div(new BigNumber(10).pow(18))
}


export const getMultiplier = async(web3:any, pid:any) => {
    const [info] = await multicall(web3, masterchefABI, [
        {
          address: masterChef,
          name: 'poolInfo',
          params: [pid],
        }
      ])
      const allocPoint = new BigNumber(info.allocPoint._hex)
      return new BigNumber(allocPoint.div(100).toString())
}



export const balanceTokenLP = async(web3:any, lp:any, tokenA:any, tokenB:any) => {
    const calls = [
        {
            address: tokenA,
            name: 'balanceOf',
            params: [lp],
          },
          {
            address: tokenB,
            name: 'balanceOf',
            params: [lp],
          },
          {
            address: lp,
            name: 'totalSupply',
          }
      ]
      const [balanceA, balanceB, totalSupply] = await multicall(web3, erc20, calls)
      return {
        balanceA: new BigNumber(balanceA.balance._hex).div(new BigNumber(10).pow(18)),
        balanceB: new BigNumber(balanceB.balance._hex).div(new BigNumber(10).pow(18)),
        totalSupply: new BigNumber(totalSupply[0]._hex).div(new BigNumber(10).pow(18))
      }
}



export const priceGeneral_BNB = async(web3:any, lp:any, token:any, pid:any, mChef:any, tokenLP:any) => {
    const lpAdress = lp
    const calls = [
      {
        address: token,
        name: 'balanceOf',
        params: [lpAdress],
      },
      {
        address: wbnb,
        name: 'balanceOf',
        params: [lpAdress],
      },
      {
        address: tokenLP,
        name: 'balanceOf',
        params: [mChef],
      },
      {
        address: lpAdress,
        name: 'totalSupply',
      },
      {
        address: token,
        name: 'decimals',
      },
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
      const tokenAmount = new BigNumber(tokenBalanceLP).div(new BigNumber(10).pow(tokenDecimals)).times(lpTokenRatio)
      const quoteTokenAmount = new BigNumber(quoteTokenBlanceLP).div(new BigNumber(10).pow(quoteTokenDecimals)).times(lpTokenRatio)
      return {
        tokenPriceVsQuote: quoteTokenAmount.div(tokenAmount).toJSON(), //
      }
}

export const priceTokenForBNB = async(web3:any, _token:any) => {
    let priceGlobal = new BigNumber(0)
    const TOKEN = new Token(ChainId.MAINNET, _token, 18)
    const WBNB = new Token(ChainId.MAINNET, wbnb, 18)
    const address = Pair.getAddress(TOKEN, WBNB)
    const farmPrice = new web3.eth.Contract(abiPair, address)
    await farmPrice.methods.getReserves().call().then(async(r:any) => {
        let reserves0 = r._reserve0
        let reserves1 = r._reserve1
        const balances = TOKEN.sortsBefore(WBNB) ? [reserves0, reserves1] : [reserves1, reserves0]
        const prices = new Pair(new TokenAmount(TOKEN, balances[0]), new TokenAmount(WBNB, balances[1]))
        const route = new Route([prices], WBNB)
        let price = new BigNumber(route.midPrice.invert().toSignificant(8))
        priceGlobal = price
    })
    return priceGlobal
}