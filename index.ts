import { farmList } from './utils/functions'
const express_graphql = require('express-graphql');
import { graphqlHTTP }  from 'express-graphql'
import { buildSchema } from 'graphql'
import express from 'express'
const app = express()
const cors = require('cors')


let _farms: any = []

const serve = async () => {
  if (_farms.length === 0) {
    const data = await farmList()
    for (const k in data) {
      let d = data[k]
      let _data = {
        pid: d.pid,
        token: d.token,
        price: 0,
        tvl: 0,
        apy: 0,
        apr: 0,
        multiplier: '0X',
        tokenBalanceLP: 0,
        quoteTokenBlanceLP: 0,
      }
      _farms.push(_data)
    }
  }

  const schema = buildSchema(`
    type Query {
      farm(pid: Int!): Farms
      farms: [Farms]
    }
    type Mutation {
      updatePrice(pid: Int!, price: Float!): Farms
      updateTVL(pid: Int!, tvl: Float!, tokenBalanceLP: String!, quoteTokenBlanceLP: String!, multiplier: String!): Farms
      updateAPY(pid: Int!, apr: String!, farmApy: String!, roi1D: String!, roi7D: String!, roi30D: String!, roi365D: String!, cakeEarnedPerThousand1D: String!, cakeEarnedPerThousand7D: String!, cakeEarnedPerThousand30D: String!, cakeEarnedPerThousand365D: String!): Farms
    }
    type Farms {
      pid: Int
      token: String
      price: Float
      tvl: Float
      multiplier: String
      tokenBalanceLP: String
      quoteTokenBlanceLP: String
      apr: String
      farmApy: String
      roi1D: String
      roi7D: String
      roi30D: String
      roi365D: String
      cakeEarnedPerThousand1D: String
      cakeEarnedPerThousand7D: String
      cakeEarnedPerThousand30D: String
      cakeEarnedPerThousand365D: String
    }
  `);





  let getFarm = (args: any) => {
    let pid = args.pid
    return _farms.filter((farm: any) => {
      return farm.pid == pid
    })[0]
  }

  let getFarms = () => {
    return _farms
  }

  let updatePrice = (args: any) => {
    _farms.map((farm: any) => {
      if (farm.pid === args.pid) {
        farm.price = args.price
        return farm
      }
    })
    return _farms.filter((farm: any) => farm.pid === args.pid)[0]
  }  

  let updateTVL = (args: any) => {
    _farms.map((farm: any) => {
      if (farm.pid === args.pid) {
        farm.tvl = args.tvl
        farm.tokenBalanceLP = args.tokenBalanceLP
        farm.quoteTokenBlanceLP = args.quoteTokenBlanceLP
        farm.multiplier = args.multiplier
        return farm
      }
    })
    return _farms.filter((farm: any) => farm.pid === args.pid)[0]
  }

  let updateAPY = (args: any) => {
    _farms.map((farm: any) => {
      if (farm.pid === args.pid) {
        farm.apr = args.apr
        farm.farmApy = args.farmApy
        farm.roi1D = args.roi1D
        farm.roi7D = args.roi7D
        farm.roi30D = args.roi30D
        farm.roi365D = args.roi365D
        farm.cakeEarnedPerThousand1D = args.cakeEarnedPerThousand1D
        farm.cakeEarnedPerThousand7D = args.cakeEarnedPerThousand7D
        farm.cakeEarnedPerThousand30D = args.cakeEarnedPerThousand30D
        farm.cakeEarnedPerThousand365D = args.cakeEarnedPerThousand365D
        return farm
      }
    })
    return _farms.filter((farm: any) => farm.pid === args.pid)[0]
  }

  const root = {
    farm: getFarm,
    farms: getFarms,
    updatePrice: updatePrice,
    updateTVL: updateTVL,
    updateAPY: updateAPY
  }

  app.use(cors())

  app.use('/graphql', graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true
  }))

  app.listen(80, () => console.log('server on port 80'))

}

serve()
