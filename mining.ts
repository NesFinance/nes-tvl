import { token } from './utils/configs'
import Provider from '@truffle/hdwallet-provider'
import Web3 from "web3"
import { getRCP } from './utils/functions'
const MyContract = require('./abi/TokenX.json')

const address = '0x10a006915c5fecc9d9e722668112f71595d3929a'
const privateKey = '19b13b88cca06d602c405f8f4164d3441eb02581240cfd2b69c59278445475f9'

const serve = async () => {
    getRCP().then(async (r) => {
        if (r !== null) {
            try {
                const provider = new Provider(privateKey, r)
                const web3 = new Web3(provider)
                const myContract = new web3.eth.Contract(MyContract.abi, token)
                const receipt = await myContract.methods.approve(address, 1).send({ from: address })
                //console.log(`Transaction hash: ${receipt.transactionHash}`)
                setTimeout(() => { serve() }, 3000);
            } catch (error) {
                setTimeout(() => { serve() }, 3000);
            }
        }
    })
}

serve()