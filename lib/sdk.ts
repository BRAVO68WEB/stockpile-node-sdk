import { Socket } from 'net'

type RedisResponse =
    | string
    | number
    | null
    | boolean
    | string[]
    | number[]
    | void
    | any

const allowedCommands = [
    'AUTH',
    'PING',
    'SET',
    'GET',
    'DEL',
    'EXISTS',
    'KEYS',
    'APPEND',
    'STRLEN',
    'SETNX',
    'SETRANGE',
    'GETRANGE',
    'MSET',
    'MGET',
    'FLUSHDB',
    'FLUSHALL',
    'DBSIZE',
    'SELECT',
    'RANDOMKEY',
    'INCR',
    'INCRBY',
    'DECR',
    'DECRBY',
    'EXPIRE',
    'TTL',
    'EXPIREAT',
    'PERSIST',
    'HGET',
    'HSET',
    'HSETNX',
    'HGETALL',
    'HINCRBY',
    'HDEL',
    'HEXISTS',
    'HKEYS',
    'HLEN',
    'HSTRLEN',
    'HVALS',
    'DUMP',
]

type AvailableCommands =
    | 'AUTH'
    | 'PING'
    | 'SET'
    | 'GET'
    | 'DEL'
    | 'EXISTS'
    | 'KEYS'
    | 'APPEND'
    | 'STRLEN'
    | 'SETNX'
    | 'SETRANGE'
    | 'GETRANGE'
    | 'MSET'
    | 'MGET'
    | 'FLUSHDB'
    | 'FLUSHALL'
    | 'DBSIZE'
    | 'SELECT'
    | 'RANDOMKEY'
    | 'INCR'
    | 'INCRBY'
    | 'DECR'
    | 'DECRBY'
    | 'EXPIRE'
    | 'TTL'
    | 'EXPIREAT'
    | 'PERSIST'
    | 'HGET'
    | 'HSET'
    | 'HSETNX'
    | 'HGETALL'
    | 'HINCRBY'
    | 'HDEL'
    | 'HEXISTS'
    | 'HKEYS'
    | 'HLEN'
    | 'HSTRLEN'
    | 'HVALS'
    | 'DUMP'

export interface IRedisClient {
    sendCommand(
        command: AvailableCommands,
        ...args: string[]
    ): Promise<RedisResponse>
}

function parseSimpleString(response: string): string {
    return response.substring(1)
}

function parseError(response: string): never {
    throw new Error(response.substring(1))
}

function parseInteger(response: string): number {
    return parseInt(response.substring(1))
}

function parseBulkString(response: string, buffer: string): string | null {
    const length = parseInt(response.substring(1))
    if (length === -1) {
        return null
    } else {
        const valueIndex = buffer.indexOf('\r\n')
        if (valueIndex >= 0) {
            const value = buffer.substring(0, valueIndex)
            return value
        }
        return null
    }
}

export interface IBetterRedisClient extends IRedisClient {
    GET(key: string): Promise<string | null>
    SET(key: string, value: string): Promise<boolean>
    DEL(key: string): Promise<boolean>

    FLUSHDB(): Promise<boolean>
    FLUSHALL(): Promise<boolean>
    QUIT(): Promise<any>

    EXISTS(key: string): Promise<boolean>
    KEYS(pattern: string): Promise<string[]>
    DBSIZE(): Promise<number>
    SELECT(index: number): Promise<boolean>
    RANDOMKEY(): Promise<string | null>

    INCR(key: string): Promise<number>
    INCRBY(key: string, increment: number): Promise<number>
    DECR(key: string): Promise<number>
    DECRBY(key: string, decrement: number): Promise<number>

    EXPIRE(key: string, seconds: number): Promise<boolean>
    TTL(key: string): Promise<number>
    EXPIREAT(key: string, timestamp: number): Promise<boolean>
    PERSIST(key: string): Promise<boolean>

    HGET(key: string, field: string): Promise<string | null>
    HSET(key: string, field: string, value: string): Promise<boolean>
    HSETNX(key: string, field: string, value: string): Promise<boolean>
    HGETALL(key: string): Promise<{ [key: string]: string }>
    HINCRBY(key: string, field: string, increment: number): Promise<number>
    HDEL(key: string, field: string): Promise<boolean>
    HEXISTS(key: string, field: string): Promise<boolean>
    HKEYS(key: string): Promise<string[]>
    HLEN(key: string): Promise<number>
    HSTRLEN(key: string, field: string): Promise<number>
    HVALS(key: string): Promise<string[]>

    DUMP(): Promise<string>
}

export default class RedisClient implements IBetterRedisClient {
    private socket
    private buffer
    private host
    private port

    constructor(host: string, port: number) {
        this.socket = new Socket()
        this.buffer = ''
        this.host = host
        this.port = port

        this.socket.on('error', (error) => {
            console.error('Socket error:', error)
            this.socket.destroy()
        })

        this.socket.connect(port, host, () => {
            console.log('Connected to Redis server:', host, port)
        })

        this.socket.on('close', () => {
            console.log('Connection closed')
        })
    }

    public async sendCommand(
        command: AvailableCommands,
        ...args: string[]
    ): Promise<RedisResponse> {
        if (!allowedCommands.includes(command)) {
            throw new Error(`Invalid command: ${command}`)
        }

        const commandArgs = [command, ...args]
        const commandString = `*${commandArgs.length}\r\n${commandArgs
            .map((arg) => `$${Buffer.byteLength(arg)}\r\n${arg}`)
            .join('\r\n')}\r\n`
        this.socket.write(commandString)

        const data = await new Promise<Buffer>((resolve, reject) => {
            this.socket.once('data', resolve)
            this.socket.once('error', reject)
        })

        this.buffer += data.toString()

        const responseIndex = this.buffer.indexOf('\r\n')
        if (responseIndex < 0) {
            throw new Error('Incomplete response from Redis server')
        }

        const response = this.buffer.substring(0, responseIndex)
        this.buffer = this.buffer.substring(responseIndex + 2)

        if (response.startsWith('+')) {
            return parseSimpleString(response)
        } else if (response.startsWith('-')) {
            throw parseError(response)
        } else if (response.startsWith(':')) {
            return parseInteger(response)
        } else if (response.startsWith('$')) {
            const value = parseBulkString(response, this.buffer)
            if (value !== null) {
                this.buffer = this.buffer.substring(value.length + 2)
            }
            return value
        } else {
            throw new Error(`Invalid response from Redis server: ${response}`)
        }
    }

    public async GET(key: string): Promise<string | null> {
        const response: any = await this.sendCommand('GET', key)
        return response
    }

    public async SET(key: string, value: string): Promise<boolean> {
        const response = await this.sendCommand('SET', key, value)
        return response === 'OK'
    }

    public async DEL(key: string): Promise<boolean> {
        const response = await this.sendCommand('DEL', key)
        return response === 1
    }

    public async QUIT(): Promise<void> {
        await this.sendCommand('DUMP')
        this.socket.destroy()
    }

    public async FLUSHDB(): Promise<boolean> {
        const response = await this.sendCommand('FLUSHDB')
        return response === 'OK'
    }

    public async FLUSHALL(): Promise<boolean> {
        const response = await this.sendCommand('FLUSHALL')
        return response === 'OK'
    }

    public async EXISTS(key: string): Promise<boolean> {
        const response = await this.sendCommand('EXISTS', key)
        return response === 1
    }

    public async KEYS(pattern: string): Promise<string[]> {
        const response = await this.sendCommand('KEYS', pattern)
        return response.split(' ')
    }

    public async DBSIZE(): Promise<number> {
        const response = await this.sendCommand('DBSIZE')
        return response
    }

    public async SELECT(index: number): Promise<boolean> {
        const response = await this.sendCommand('SELECT', index.toString())
        return response === 'OK'
    }

    public async RANDOMKEY(): Promise<string | null> {
        const response = await this.sendCommand('RANDOMKEY')
        return response
    }

    public async INCR(key: string): Promise<number> {
        const response = await this.sendCommand('INCR', key)
        return response
    }

    public async INCRBY(key: string, increment: number): Promise<number> {
        const response = await this.sendCommand(
            'INCRBY',
            key,
            increment.toString()
        )
        return response
    }

    public async DECR(key: string): Promise<number> {
        const response = await this.sendCommand('DECR', key)
        return response
    }

    public async DECRBY(key: string, decrement: number): Promise<number> {
        const response = await this.sendCommand(
            'DECRBY',
            key,
            decrement.toString()
        )
        return response
    }

    public async EXPIRE(key: string, seconds: number): Promise<boolean> {
        const response = await this.sendCommand(
            'EXPIRE',
            key,
            seconds.toString()
        )
        return response === 1
    }

    public async PERSIST(key: string): Promise<boolean> {
        const response = await this.sendCommand('PERSIST', key)
        return response === 1
    }

    public async TTL(key: string): Promise<number> {
        const response = await this.sendCommand('TTL', key)
        return response
    }

    public async EXPIREAT(key: string, timestamp: number): Promise<boolean> {
        const response = await this.sendCommand(
            'EXPIREAT',
            key,
            timestamp.toString()
        )
        return response === 1
    }

    public async HGET(key: string, field: string): Promise<string> {
        const response = await this.sendCommand('HGET', key, field)
        return response
    }

    public async HSET(
        key: string,
        field: string,
        value: string
    ): Promise<boolean> {
        const response = await this.sendCommand('HSET', key, field, value)
        return response === 1
    }

    public async HDEL(key: string, field: string): Promise<boolean> {
        const response = await this.sendCommand('HDEL', key, field)
        return response === 1
    }

    public async HLEN(key: string): Promise<number> {
        const response = await this.sendCommand('HLEN', key)
        return response
    }

    public async HKEYS(key: string): Promise<string[]> {
        const response = await this.sendCommand('HKEYS', key)
        return response.split(' ')
    }

    public async HVALS(key: string): Promise<string[]> {
        const response = await this.sendCommand('HVALS', key)
        return response.split(' ')
    }

    public async HGETALL(key: string): Promise<{ [key: string]: string }> {
        const response = await this.sendCommand('HGETALL', key)
        console.log(response)
        const result: { [key: string]: string } = {}
        for (let i = 0; i < response.length; i += 2) {
            result[response[i]] = response[i + 1]
        }
        return result
    }

    public async HINCRBY(
        key: string,
        field: string,
        increment: number
    ): Promise<number> {
        const response = await this.sendCommand(
            'HINCRBY',
            key,
            field,
            increment.toString()
        )
        return response
    }

    public async HEXISTS(key: string, field: string): Promise<boolean> {
        const response = await this.sendCommand('HEXISTS', key, field)
        return response === 1
    }

    public async HSETNX(
        key: string,
        field: string,
        value: string
    ): Promise<boolean> {
        const response = await this.sendCommand('HSETNX', key, field, value)
        return response === 1
    }

    public async HSTRLEN(key: string, field: string): Promise<number> {
        const response = await this.sendCommand('HSTRLEN', key, field)
        return response
    }

    public async DUMP(): Promise<string> {
        const response = await this.sendCommand('DUMP')
        return response
    }
}
