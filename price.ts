import {initRCP, initFirebase, getPriceToken, insertPrice} from './utils/functions'

const serve = async() => {
    initFirebase().then(async(db) => {
        if(db !== null){
            initRCP().then(async(web3) => {
                if(web3 !== null){
                    getPriceToken(web3).then(async(p) => {
                        await insertPrice(db, p)
                        setTimeout(() => {
                            serve() 
                        }, 15000);                        
                    })
                }
            })
        }
    })
}

serve()
