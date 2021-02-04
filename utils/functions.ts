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
import {configs, farms, wbnb, router, factory, cake_pool, jetfuel_pool, masterChef, usdt, token} from './configs'
import { ChainId, Token, Route, Pair, TokenAmount } from '@pancakeswap-libs/sdk'
import firebase from "../firebase";
import "firebase/firestore";

export const initFirebase = async() => {
    return firebase.firestore()
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

export const insertDB = async(db:any, pid:any, amount:any) => {
    await db.collection("tvl").doc("pid_" + pid).get().then(async (snapshot:any) => {
        if (snapshot.exists === true) {
            let docRef = db.collection("tvl").doc("pid_" + pid)
            await docRef.update({ tvl: parseFloat(amount) })
        } else {
            let docRef = db.collection("tvl").doc("pid_" + pid)
            await docRef.set({ tvl: parseFloat(amount) })
        }
    }).catch(() => { })      
}

export const insertTVL = async(db:any, amount:any) => {
    await db.collection("tvl").doc("tvl").get().then(async (snapshot:any) => {
        if (snapshot.exists === true) {
            let docRef = db.collection("tvl").doc("tvl")
            await docRef.update({ tvl: parseFloat(amount) })
        } else {
            let docRef = db.collection("tvl").doc("tvl")
            await docRef.set({ tvl: parseFloat(amount) })
        }
    }).catch(() => { })      
}

export const insertPrice = async(db:any, amount:any) => {
    await db.collection("price").doc("price").get().then(async (snapshot:any) => {
        if (snapshot.exists === true) {
            let docRef = db.collection("price").doc("price")
            await docRef.update({ price: parseFloat(amount) })
        } else {
            let docRef = db.collection("price").doc("price")
            await docRef.set({ price: parseFloat(amount) })
        }
    }).catch(() => { })      
}

export const getPriceToken = async(w:any) => {
    let priceGlobal = 0
    const TOKEN = new Token(ChainId.MAINNET, token, 18)
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


export const getTVLUSDT = async(w:any, lp:any, tokenA:any, tokenB:any, tokenLP:any, type:any, from:any) => {
    const _tokenB = new w.eth.Contract(abiToken, tokenB)
    const _lp = new w.eth.Contract(abiToken, lp)

    const totalTokenB:any = parseFloat(await _tokenB.methods.balanceOf(lp).call()) / (10 ** 18)
    const totalTokensLP = parseFloat(await _lp.methods.totalSupply().call()) / (10 ** 18)
    let totalTokensChef:number = 0

    if(type === 'other' && from === 'cake'){
        const _tokenLP = new w.eth.Contract(abiCakeLP, tokenLP)
        const _cake_pool = new w.eth.Contract(abiChefCake, cake_pool)
        const pid = await _tokenLP.methods.pid().call()
        const totalTokensInLP = parseFloat((await _cake_pool.methods.userInfo(pid, tokenLP).call()).amount) / (10 ** 18)
        totalTokensChef = totalTokensInLP
    }
    if(type === 'own'){
        totalTokensChef = parseFloat((await _lp.methods.balanceOf(masterChef).call())) / (10 ** 18)
    }

    let priceA = 0
    let priceB = 0
    let totalLiquidityUSD = 0
    let priceTokenLP:number = 0
    let tvl:any = 0

    const TOKEN_B = new Token(ChainId.MAINNET, tokenB, 18)

    const TOKEN = new Token(ChainId.MAINNET, tokenA, 18)
    const USDT = new Token(ChainId.MAINNET, usdt, 18)
    const WBNB = new Token(ChainId.MAINNET, wbnb, 18)

    const address_B = Pair.getAddress(TOKEN_B, USDT)
    const farmPrice_B = new w.eth.Contract(abiPair, address_B)

    const address = Pair.getAddress(TOKEN, WBNB)
    const farmPrice = new w.eth.Contract(abiPair, address)
    await farmPrice.methods.getReserves().call().then(async(r:any) => {
        let reserves0 = r._reserve0
        let reserves1 = r._reserve1
        const balances = TOKEN.sortsBefore(WBNB) ? [reserves0, reserves1] : [reserves1, reserves0]
        const prices = new Pair(new TokenAmount(TOKEN, balances[0]), new TokenAmount(WBNB, balances[1]))
        const route = new Route([prices], WBNB)
        let price:any = route.midPrice.invert().toSignificant(8)
        const addressUSDT = Pair.getAddress(WBNB, USDT)
        const farmPriceUSDT = new w.eth.Contract(abiPair, addressUSDT)
        await farmPriceUSDT.methods.getReserves().call().then(async(r:any) => {
            let reserves0_USDT = r._reserve0
            let reserves1_USDT = r._reserve1
            const balances_USDT = USDT.sortsBefore(WBNB) ? [reserves0_USDT, reserves1_USDT] : [reserves1_USDT, reserves0_USDT]
            const prices_USDT = new Pair(new TokenAmount(USDT, balances_USDT[0]), new TokenAmount(WBNB, balances_USDT[1]))
            const route_USDT:any = new Route([prices_USDT], WBNB)
            let price_USDT:any = 1 / route_USDT.midPrice.invert().toSignificant(8)
            let priceToken = price_USDT * price
            priceA = priceToken
        })
    })


    await farmPrice_B.methods.getReserves().call().then(async(r:any) => {
        let reserves0 = r._reserve0
        let reserves1 = r._reserve1
        const balances = TOKEN_B.sortsBefore(USDT) ? [reserves0, reserves1] : [reserves1, reserves0]
        const prices = new Pair(new TokenAmount(TOKEN_B, balances[0]), new TokenAmount(USDT, balances[1]))
        const route = new Route([prices], USDT)
        let price = route.midPrice.invert().toSignificant(8)
        priceB = parseFloat(price) * parseFloat(totalTokenB)
    })
    totalLiquidityUSD = priceA + priceB
    priceTokenLP = totalLiquidityUSD / totalTokensLP
    
    tvl = totalTokensChef * priceTokenLP

    return tvl
}


export const getTVL = async(w:any, lp:any, tokenA:any, tokenB:any, tokenLP:any, type:any, from:any) => {
    const _tokenA = new w.eth.Contract(abiToken, tokenA)
    const _tokenB = new w.eth.Contract(abiToken, tokenB)
    const _lp = new w.eth.Contract(abiToken, lp)
    const totalTokenA:any = parseFloat(await _tokenA.methods.balanceOf(lp).call()) / (10 ** 18)
    const totalTokenB:any = parseFloat(await _tokenB.methods.balanceOf(lp).call()) / (10 ** 18)
    const totalTokensLP:any = parseFloat(await _lp.methods.totalSupply().call()) / (10 ** 18)
    let totalTokensChef:number = 0
    if(type === 'other' && from === 'cake'){
        const _tokenLP = new w.eth.Contract(abiCakeLP, tokenLP)
        const _cake_pool = new w.eth.Contract(abiChefCake, cake_pool)
        const pid = await _tokenLP.methods.pid().call()
        const totalTokensInLP = parseFloat((await _cake_pool.methods.userInfo(pid, tokenLP).call()).amount) / (10 ** 18)
        totalTokensChef = totalTokensInLP
    }
    if(type === 'other' && from === 'jetfuel'){
        const _tokenLP = new w.eth.Contract(abiCakeLP, tokenLP)
        const _cake_pool = new w.eth.Contract(abiChefCake, jetfuel_pool)
        const pid = await _tokenLP.methods.pid().call()
        const totalTokensInLP = parseFloat((await _cake_pool.methods.userInfo(pid, tokenLP).call()).amount) / (10 ** 18)
        totalTokensChef = totalTokensInLP
    }
    if(type === 'own'){
        totalTokensChef = parseFloat((await _lp.methods.balanceOf(masterChef).call())) / (10 ** 18)
    }
    let priceA:any = 0
    let priceB:any = 0
    let totalLiquidityUSD:any = 0
    let priceTokenLP:number = 0
    let tvl:any = 0
    const TOKEN_A = new Token(ChainId.MAINNET, tokenA, 18)
    const TOKEN_B = new Token(ChainId.MAINNET, tokenB, 18)
    const USDT = new Token(ChainId.MAINNET, usdt, 18)
    const address_A = Pair.getAddress(TOKEN_A, USDT)
    const farmPrice_A = new w.eth.Contract(abiPair, address_A)
    const address_B = Pair.getAddress(TOKEN_B, USDT)
    const farmPrice_B = new w.eth.Contract(abiPair, address_B)
    await farmPrice_A.methods.getReserves().call().then(async(r:any) => {
        let reserves0 = r._reserve0
        let reserves1 = r._reserve1
        const balances = TOKEN_A.sortsBefore(USDT) ? [reserves0, reserves1] : [reserves1, reserves0]
        const prices = new Pair(new TokenAmount(TOKEN_A, balances[0]), new TokenAmount(USDT, balances[1]))
        const route = new Route([prices], USDT)
        let price:any = parseFloat(route.midPrice.invert().toSignificant(8))
        priceA = parseFloat(price) * parseFloat(totalTokenA)
    }).catch(async(e:any) => {
        const TOKEN = new Token(ChainId.MAINNET, tokenA, 18)
        const USDT = new Token(ChainId.MAINNET, usdt, 18)
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
            const addressUSDT = Pair.getAddress(WBNB, USDT)
            const farmPriceUSDT = new w.eth.Contract(abiPair, addressUSDT)
            await farmPriceUSDT.methods.getReserves().call().then(async(r:any) => {
                let reserves0_USDT = r._reserve0
                let reserves1_USDT = r._reserve1
                const balances_USDT = USDT.sortsBefore(WBNB) ? [reserves0_USDT, reserves1_USDT] : [reserves1_USDT, reserves0_USDT]
                const prices_USDT = new Pair(new TokenAmount(USDT, balances_USDT[0]), new TokenAmount(WBNB, balances_USDT[1]))
                const route_USDT:any = new Route([prices_USDT], WBNB)
                let price_USDT:any = 1 / route_USDT.midPrice.invert().toSignificant(8)
                let priceToken = price_USDT * price
                priceA = priceToken
            })
        })
    })
    await farmPrice_B.methods.getReserves().call().then(async(r:any) => {
        let reserves0 = r._reserve0
        let reserves1 = r._reserve1
        const balances = TOKEN_B.sortsBefore(USDT) ? [reserves0, reserves1] : [reserves1, reserves0]
        const prices = new Pair(new TokenAmount(TOKEN_B, balances[0]), new TokenAmount(USDT, balances[1]))
        const route = new Route([prices], USDT)
        let price = route.midPrice.invert().toSignificant(8)
        priceB = parseFloat(price) * parseFloat(totalTokenB)
    })
    totalLiquidityUSD = priceA + priceB
    priceTokenLP = totalLiquidityUSD / totalTokensLP
    tvl = (totalTokensChef * priceTokenLP)
    return tvl
}



export const getStakingTVL = async(w:any, lp:any, tokenA:any, tokenB:any, tokenLP:any, type:any, from:any) => {
    const _lp = new w.eth.Contract(abiToken, lp)
    const _tokenLP = new w.eth.Contract(abiToken, tokenLP)

    let totalTokensChef:number = 0
    if(type === 'own'){
        totalTokensChef = parseFloat((await _lp.methods.balanceOf(masterChef).call())) / (10 ** 18)
    } else {
        totalTokensChef = parseFloat((await _tokenLP.methods.balanceOf(masterChef).call())) / (10 ** 18)
    }
    let priceA:number = 0
    let tvl = 0
    const TOKEN_A = new Token(ChainId.MAINNET, tokenA, 18)
    const USDT = new Token(ChainId.MAINNET, usdt, 18)
    const address_A = Pair.getAddress(TOKEN_A, USDT)
    const farmPrice_A = new w.eth.Contract(abiPair, address_A)
    await farmPrice_A.methods.getReserves().call().then(async(r:any) => {
        let reserves0 = r._reserve0
        let reserves1 = r._reserve1
        const balances = TOKEN_A.sortsBefore(USDT) ? [reserves0, reserves1] : [reserves1, reserves0]
        const prices = new Pair(new TokenAmount(TOKEN_A, balances[0]), new TokenAmount(USDT, balances[1]))
        const route:any = new Route([prices], USDT)
        let price:number = route.midPrice.invert().toSignificant(8)
        //priceA = parseFloat(price) * parseFloat(totalTokenA)
        priceA = price
    }).catch(async(e:any) => {
        const TOKEN = new Token(ChainId.MAINNET, tokenA, 18)
        const USDT = new Token(ChainId.MAINNET, usdt, 18)
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
                priceA = priceToken
            })
        })
    })
    tvl = (totalTokensChef * priceA)
    return tvl
}


