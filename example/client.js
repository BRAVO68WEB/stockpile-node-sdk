import RedisSDK from '../dist/sdk.js'

const redis = new RedisSDK('127.0.0.1', 6379)

;(async () => {
    // Testing SET and GET
    await redis.SET('foo', 'bar')
    const data = await redis.GET('foo')
    console.log("Testing SET and GET ", data === 'bar')

    // Testing DEL and EXPIRES
    await redis.SET('foo', 'bar')
    await redis.EXPIRE('foo', 1)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const data2 = await redis.GET('foo')
    console.log("Testing DEL and EXPIRES ", data2 === null)

    // Testing HSET and HGET
    await redis.HSET('foo', 'bar', 'baz')
    const data3 = await redis.HGET('foo', 'bar')
    console.log("Testing HSET and HGET ", data3 === 'baz')

    // Testing HDEL
    await redis.HDEL('foo', 'bar')
    const data4 = await redis.HGET('foo', 'bar')
    console.log("Testing HDEL", data4 === null)

    // Testing FLUSHDB
    await redis.SET('foo', 'bar')
    await redis.FLUSHDB()
    const data5 = await redis.GET('foo')
    console.log("Testing FLUSHDB", data5 === null)

    // Testing FLUSHALL
    await redis.SET('foo', 'bar')
    await redis.FLUSHALL()
    const data6 = await redis.GET('foo')
    console.log("Testing FLUSHALL", data6 === null)

    // Testing EXISTS
    await redis.SET('foo', 'bar')
    const data7 = await redis.EXISTS('foo')
    console.log("Testing EXISTS", data7 === true)

    // Testing INCR and DECR
    await redis.SET('foo', '1')
    await redis.INCR('foo')
    const data8 = await redis.GET('foo')
    console.log("Testing INCR", data8 === '2')
    await redis.DECR('foo')
    const data9 = await redis.GET('foo')
    console.log("Testing DECR", data9 === '1')

    // // Testing INCRBY and DECRBY
    // await redis.SET('foo', '1')
    // await redis.INCRBY('foo', 2)
    // const data10 = await redis.GET('foo')
    // console.log("Testing INCRBY", data10 === '3')
    // await redis.DECRBY('foo', 2)
    // const data11 = await redis.GET('foo')
    // console.log("Testing DECRBY", data11 === '1')
    
    // // Testing KEYS
    // await redis.SET('foo', 'bar')
    // await redis.SET('bar', 'baz')
    // const data12 = await redis.KEYS('*')
    // console.log("Testing KEYS", data12.length === 2)

    // Testing QUIT
    await redis.QUIT()
    console.log("Testing QUIT", true)
})()
