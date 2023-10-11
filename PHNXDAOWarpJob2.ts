// Import necessary modules
import { LCDClient, MnemonicKey, Wallet } from '@terra-money/feather.js';
import { uint, cond, fn, msg, variable, job, ts, WarpSdk } from '@terra-money/warp-sdk';

// Access stored mnemonic key from the environment variable
const mnemonic: string | undefined = process.env.PHNXDAO_MNEMONIC;

// Check if the environment variable is defined, if not terminate the process.
if (!mnemonic) {
    console.error('PHNXDAO_MNEMONIC environment variable is not set.');
    process.exit(1);
}

const piscoLcdClientConfig: LCDClientConfig = {
    lcd: 'https://pisco-lcd.terra.dev',
    chainID: 'pisco-1',
    gasAdjustment: 1.75,
    gasPrices: { uluna: 0.15 },
    prefix: 'terra',
};

// Configure your LCD client
const lcd = new LCDClient({
    'pisco-1': piscoLcdClientConfig,
});

// Create a wallet using your mnemonic key
const wallet = new Wallet(lcd, new MnemonicKey({ mnemonic }));

// Create a new Warp SDK instance
const sdk = new WarpSdk(wallet,piscoLcdClientConfig);
const sender = wallet.key.accAddress(piscoLcdClientConfig.prefix);

// Define job configuration
const nextExecution = variable
    .static()
    .kind('uint')
    .name('next_execution')
    .value(ts.date(new Date('2023-10-12T12:30:00.000Z')))
    .onSuccess(fn.uint(uint.expr(uint.simple(ts.days(1)), 'add', uint.env('time'))))
    .onError(fn.uint(uint.expr(uint.simple(ts.hours(1)), 'add', uint.env('time'))))
    .compose();

const condition = cond.uint(uint.env('time'), 'gt', uint.ref(nextExecution));

const createJobMsg = job
    .create()
    .name('Phoenix-DAO--Staking-Rewards')
    .description('Distribute 5500 FIRE daily to stakers in PhoenixDAO.')
    .labels([])
    .recurring(true)
    .requeueOnEvict(true)
    .reward('20000')
    .cond(condition)
    .var(nextExecution)
    .msg(msg.execute('terra1aecddsx0lvmylpzgq9le8uw4apnplhswp44vznecll6ccu044gnqsgcsga', {
        wasm: {
            execute: {
                contract_addr: 'terra1glmyjcqvf2q5fsjan8cx2ck4f8vm8hdj9tvssccdf8ee5kn3xr2seaps04', // PhoenixDAO Funds Distributor addr
                msg: 'eyJkaXN0cmlidXRlIjp7fX0=', // Distribute msg base64 encoded
            }
        }
    }))
    .compose();

// Create and submit the Warp job
sdk.createJob(wallet.key.accAddress, createJobMsg).then((response) => {
    console.log('Warp job created:', response);
});
