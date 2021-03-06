import {DbTransaction, TransactionStringEnv} from '../../db/transaction';
import {TransactionProcessor} from '../../db/transaction-processor';
import { Big } from 'big.js';
import { TransactionReconciliation } from "../records/transaction-reconciliation";
import { Transaction } from "../records/transaction";
import { BankTransaction } from "../records/bank-transaction";
import { Logger } from "../../services/logger";


/**
 * @deprecated Use ReconcilebankTransaction - this is here for legacy purposes
 */
export class CreateTransactionReconciliation extends DbTransaction {

    amount: Big;
    transactionId: number;
    bankTransactionId: number;
    transactionAmountOverride: boolean;

    getTypeId(): string {
        return 'CreateTransactionReconciliation';
    }

    apply(tp: TransactionProcessor) {

        // TODO: Validation

        let table = tp.table(TransactionReconciliation);
        let t = new TransactionReconciliation();
        t.id = this.id * 100000;
        t.amount = this.amount;
        t.transactionId = this.transactionId;
        t.bankTransactionId = this.bankTransactionId;
        t.transactionAmountOverride = this.transactionAmountOverride;
        

        let transactionTable = tp.table(Transaction);
        let transaction = transactionTable.by('id', <any> this.transactionId);
        if (transaction == null) {
            Logger.get('create-transaction-reconciliation').info('Trying to reconcile against deleted transaction. Skipping.');
            return;
        }

        if (!transaction.x.reconciliationRecords) transaction.x.reconciliationRecords = []; 
        transaction.x.reconciliationRecords.push(t);

        let bankTransactionTable = tp.table(BankTransaction);
        let bankTransaction = bankTransactionTable.by('id', <any> this.bankTransactionId);
        if (bankTransaction == null) {
            Logger.get('create-transaction-reconciliation').info('Trying to reconcile against deleted bank transaction. Skipping.');
            return;
        }
            
        if (!bankTransaction.x.reconciliationRecords) bankTransaction.x.reconciliationRecords = []; 
        bankTransaction.x.reconciliationRecords.push(<any> t);
        this.updateBankTransactionReconciliationFlags(bankTransaction);
        bankTransactionTable.update(bankTransaction);

        if (this.transactionAmountOverride) transaction.amount = this.amount;
        transaction.accountId = bankTransaction.accountId;
        this.updateTransactionReconciliationFlags(transaction);
        transactionTable.update(transaction);


        table.insert(t);

        tp.mapTransactionAndRecord(this, t);
    }

    update(tp: TransactionProcessor) {
        let table = tp.table(TransactionReconciliation);
        let t = table.by('id', <any> (this.id * 100000));

        if (t.transactionId !== this.transactionId || t.bankTransactionId !== this.bankTransactionId) {
            tp.unsupported();
        }

        t.amount = this.amount;
        t.transactionAmountOverride = this.transactionAmountOverride;

        let transactionTable = tp.table(Transaction);
        let transaction = transactionTable.by('id', <any> this.transactionId);
        if (transaction == null) {
            Logger.get('create-transaction-reconciliation').info('Trying to reconcile against deleted transaction. Skipping. TODO: Fix this in undo');
            return;
        }


        let bankTransactionTable = tp.table(BankTransaction);
        let bankTransaction = bankTransactionTable.by('id', <any> this.bankTransactionId);
        if (bankTransaction == null) {
            Logger.get('create-transaction-reconciliation').info('Trying to reconcile against deleted bank transaction. Skipping. TODO: Fix this in undo');
            return;
        }
        this.updateBankTransactionReconciliationFlags(bankTransaction);
        bankTransactionTable.update(bankTransaction);

        if (this.transactionAmountOverride) transaction.amount = this.amount;
        // TODO: undoing the transactionAmountOverride needs to re-instate the initial amount from the initial transaction
        transaction.accountId = bankTransaction.accountId;
        this.updateTransactionReconciliationFlags(transaction);
        transactionTable.update(transaction);

        table.update(t);
    }
    
    undo(tp: TransactionProcessor) {
        let table = tp.table(TransactionReconciliation);
        let t = table.by('id', <any> (this.id * 100000));
        table.remove(t);

        let transactionTable = tp.table(Transaction);
        let transaction = transactionTable.by('id', <any> this.transactionId);

        transaction.x.reconciliationRecords.splice(transaction.x.reconciliationRecords.indexOf(t), 1);
        this.updateTransactionReconciliationFlags(transaction);
        transactionTable.update(transaction);

        let bankTransactionTable = tp.table(BankTransaction);
        let bankTransaction = bankTransactionTable.by('id', <any> this.bankTransactionId);

        bankTransaction.x.reconciliationRecords.splice(bankTransaction.x.reconciliationRecords.indexOf(<any> t), 1);
        this.updateBankTransactionReconciliationFlags(bankTransaction);
        bankTransactionTable.update(bankTransaction);

        // TODO: undoing the transactionAmountOverride needs to re-instate the initial amount from the initial transaction
        // TODO: Needs to re-instate the initial accountId from the initial transaction (if different)

        tp.unmapTransactionAndRecord(this, t);

    }

    updateTransactionReconciliationFlags(transaction: Transaction) {
        let reconTotal = (<TransactionReconciliation[]> transaction.x.reconciliationRecords).reduce((tot, t) => tot.plus(t.amount), new Big('0'));
        transaction.x.reconciled = reconTotal.eq(transaction.amount);
        transaction.x.reconciledRemaining = transaction.amount.minus(reconTotal);
    }

    updateBankTransactionReconciliationFlags(bankTransaction: BankTransaction) {
        let reconTotal = (<TransactionReconciliation[]> <any> bankTransaction.x.reconciliationRecords).reduce((tot, t) => tot.minus(t.amount), new Big('0'));
        bankTransaction.x.reconciled = reconTotal.eq(bankTransaction.amount);
        bankTransaction.x.reconciledRemaining = bankTransaction.amount.minus(reconTotal);
    }
    
    deserialize(field: string, value: any): any {
        if (field === 'amount')
            return new Big(value);
        return value;
    }

    toHumanisedString(env: TransactionStringEnv): string {
        if (env.action === 'apply') {
            return "Reconciled";
        } else if (env.action === 'update') {
            return "Reconciled";
        } else {
            return "Unreconciled";
        } 
    }


}

