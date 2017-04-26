import {DbTransaction, TransactionStringEnv} from '../../db/transaction';
import {TransactionProcessor} from '../../db/transaction-processor';
import {Account} from '../records/account';
import {AccountBalanceProcessor} from '../processors/account-balance';
import Big from 'big.js';


export class CreateAccountTransaction extends DbTransaction {

    name: string;
    accountType: 'Bank' | 'Cash';
    openingBalance: BigJsLibrary.BigJS;
    bankDetails: {accountNumber: string; bankProviderName: string};


    getTypeId(): string {
        return 'CreateAccountTransaction';
    }

    apply(tp: TransactionProcessor) {
        
        // TODO: Validation
        
        let table = tp.table(Account);
        let a = new Account();
        a.id = this.id;
        a.name = this.name;
        a.openingBalance = this.openingBalance;
        a.accountType = this.accountType;
        a.x.accountNumber = this.bankDetails.accountNumber;
        a.x.bankProviderName = this.bankDetails.bankProviderName;
        a.processors.push(new AccountBalanceProcessor(a));
        table.insert(a);
        tp.mapTransactionAndRecord(this, a);
    }

    update(tp: TransactionProcessor) {

        // TODO: Validation

        let table = tp.table(Account);
        let a = table.by('id', <any> this.id);
        a.name = this.name;
        a.openingBalance = this.openingBalance;
        a.accountType = this.accountType;
        a.x.accountNumber = this.bankDetails.accountNumber;
        a.x.bankProviderName = this.bankDetails.bankProviderName;

        table.update(a);
    }
    
    undo(tp: TransactionProcessor) {
        let table = tp.table(Account);
        let a = table.by('id', <any> this.id);
        table.remove(a);
    }
    
    deserialize(field: string, value: any): any {
        if (field === 'openingBalance' && value != null)
            return new Big(value);
        return value;
    }

    toHumanisedString(env: TransactionStringEnv): string {
        if (env.action === 'apply') {
            return "created account " + this.name;
        } else if (env.action === 'update') {
            return "renamed account {{old name}} to " + this.name;
        } else {
            return "removed account " + this.name;
        } 
    }

}

