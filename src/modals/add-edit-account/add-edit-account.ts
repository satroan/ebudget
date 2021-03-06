import {NavController, ViewController, NavParams, AlertController, App} from 'ionic-angular';
import {Db} from '../../db/db';
import {Account} from '../../data/records/account';
import {Dbms} from '../../db/dbms';
import {EngineFactory} from '../../engine/engine-factory';
import {BankProviderRegistry} from '../../bank/bank-provider-registry';
import {Engine} from '../../engine/engine';
import {CreateAccountTransaction} from '../../data/transactions/create-account-transaction';
import {Component} from '@angular/core';
import { Big } from 'big.js';
import { Configuration } from "../../services/configuration-service";
import { SetAccountBankLink } from "../../data/transactions/set-account-bank-link";
import { ProviderSchema } from "../../bank/provider-interface";
import { BankLink } from "../../data/records/bank-link";

@Component({
  templateUrl: 'add-edit-account.html'
})
export class AddEditAccountModal {
  emptyProviderSchema = new ProviderSchema();
  db: Db;
  engine: Engine;
  editing: boolean;
  data: {name: string; initialBalance: string; accountType: 'Cash' | 'Bank'; accountNumber: string; bankLinkId: number; bankLinkConfiguration: {}};
  private _bankLink: BankLink;
  transaction: CreateAccountTransaction;
  bankLinkTransaction: SetAccountBankLink;
  
  constructor(public viewCtrl: ViewController, private navParams: NavParams, private dbms: Dbms, private nav: NavController, private alertController: AlertController, private engineFactory: EngineFactory, private appController: App, private bankProviderRegistry: BankProviderRegistry, private configuration: Configuration) {    
    this.db = dbms.getDb(navParams.data.budgetId);
    this.engine = engineFactory.getEngineById(this.db.id);
    this.data = <any>{};
    this.data.bankLinkConfiguration = {};

    if (navParams.data.accountId) {
      this.editing = true;
      let account = this.engine.getRecordById(Account, navParams.data.accountId);
      this.data.name = account.name;
      this.data.initialBalance = account.initialBalance == null ? "0" : account.initialBalance.toString();
      this.data.accountType = account.accountType;
      this.transaction = this.db.transactionProcessor.findTransactionsForRecord(account, CreateAccountTransaction)[0];
      this.data.bankLinkId = account.bankLinkId;
      if (this.bankLink != null) this.data.bankLinkConfiguration[this.bankLink.provider] = account.bankLinkConfiguration;
      this.bankLinkTransaction = this.db.transactionProcessor.findTransactionsForRecord(account, SetAccountBankLink).pop();
    } else {
      this.editing = false;
      this.transaction = new CreateAccountTransaction();
      this.data.initialBalance = "0";
      this.data.accountType = 'Bank';
    }
    
  }

  get uiBankLinkId(): any {
    return this.data.bankLinkId == null ? -1 : this.data.bankLinkId;
  }

  set uiBankLinkId(bankLinkId) {
    this.data.bankLinkId = bankLinkId === -1 ? undefined : bankLinkId;
  }

  get bankLink(): BankLink {
    if (this.data.bankLinkId == null || this.data.accountType != 'Bank') {
      this._bankLink = null;
      return null;
    }
    if (this._bankLink == null || this.data.bankLinkId != this._bankLink.id) {
      this._bankLink = this.engine.getRecordById(BankLink, this.data.bankLinkId);
      if (this.data.bankLinkConfiguration[this._bankLink.provider] === undefined) this.data.bankLinkConfiguration[this._bankLink.provider] = {};
    }
    return this._bankLink;
  }

  getProviderSchema(): ProviderSchema {
    return this.bankLink == null ? this.emptyProviderSchema : this.bankProviderRegistry.getProviderSchema(this.bankLink.provider);
  }
  
  submit(event: Event) {
    event.preventDefault();

    this.transaction.name = this.data.name;
    this.transaction.initialBalance = new Big(this.data.initialBalance);
    this.transaction.accountType = this.data.accountType;

    this.db.applyTransaction(this.transaction);
    let accountRecord = this.db.transactionProcessor.findRecordsForTransaction(this.transaction, Account)[0];

    if (this.bankLinkTransaction != null && this.bankLink == null) {
      this.db.undoTransaction(this.bankLinkTransaction);      
    } else if (this.bankLink != null && this.bankLinkTransaction == null) {
      this.bankLinkTransaction = new SetAccountBankLink();
      this.bankLinkTransaction.accountId = accountRecord.id;
      this.bankLinkTransaction.bankLinkId = this.data.bankLinkId;
      this.bankLinkTransaction.configuration = this.data.bankLinkConfiguration[this.bankLink.provider];
      this.db.applyTransaction(this.bankLinkTransaction);
    } else if (this.bankLink != null && this.bankLinkTransaction != null) {
      this.bankLinkTransaction.accountId = accountRecord.id;
      this.bankLinkTransaction.bankLinkId = this.data.bankLinkId;
      this.bankLinkTransaction.configuration = this.data.bankLinkConfiguration[this.bankLink.provider];
      this.db.applyTransaction(this.bankLinkTransaction);
      
    }

    this.viewCtrl.dismiss({accountId: accountRecord.id});
  }
  
  cancel() {
    this.viewCtrl.dismiss();    
  }
  
  deleteAccountConfirm() {
    // TODO: Prolly better to archive it than delete it if anything linked to it
    let confirm = this.alertController.create({
      title: 'Delete?',
      message: 'Are you sure you want to delete this account and everything in it?',
      buttons: [
        {
          text: 'Cancel'
        } , {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            confirm.dismiss().then(() => {
              this.deleteAccount();
            });
          }
        }
      ]
    });

    confirm.present();
  }

  
  deleteAccount() {
    this.db.deleteTransaction(this.transaction);
    
    this.appController.getRootNav().pop({animate: false, duration: 0});
    this.viewCtrl.dismiss();

  }


} 