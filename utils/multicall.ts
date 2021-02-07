import {multicallAddr} from './configs'
import MultiCallAbi from '../abi/Multicall.json'
import { AbiItem } from 'web3-utils'
import { Interface } from '@ethersproject/abi'


interface Call {
    address: string
    name: string
    params?: any[]
  }

export const multicall = async (web3:any, abi: any[], calls: Call[]) => {
    const multi = new web3.eth.Contract((MultiCallAbi as unknown) as AbiItem, multicallAddr)
    const itf = new Interface(abi)
    const calldata = calls.map((call) => [call.address.toLowerCase(), itf.encodeFunctionData(call.name, call.params)])
    const { returnData } = await multi.methods.aggregate(calldata).call()
    const res = returnData.map((call:any, i:any) => itf.decodeFunctionResult(calls[i].name, call))
    return res    
}
