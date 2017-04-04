import {NavController, ViewController, NavParams, AlertController, Alert} from 'ionic-angular';
import {Dbms} from '../../db/dbms';
import {Configuration} from '../../services/configuration-service';
import {Component} from '@angular/core';
import Big from 'big.js';
import {AddEditSplitTransactionModal} from './add-edit-split-transaction';
import {Engine} from '../../engine/engine';

@Component({
  templateUrl: 'add-edit-split-transaction-line.html'
})
export class AddEditSplitTransactionLineModal {

  parent: AddEditSplitTransactionModal;
  line: any;
  lineIndex: number;
  budget: Engine;
  
  constructor(private configuration: Configuration, public viewCtrl: ViewController, private navParams: NavParams, private dbms: Dbms, private nav: NavController, private alertController: AlertController) {

    this.parent = navParams.data.parent;
    this.budget = this.parent.budget;
    this.lineIndex = navParams.data.lineIndex;
    this.line = navParams.data.parent.data.lines[this.lineIndex];

  }

  ionViewDidEnter() {
    if (this.line.categoryId == null) {
      this.showCategorySelect().onDidDismiss(() => {
        if (this.line.categoryId == null) this.viewCtrl.dismiss();
      });
    }

    this.viewCtrl.onDidDismiss(() => {
      if (this.line.categoryId == null) {
        this.parent.data.lines.splice(this.parent.data.lines.indexOf(this.line), 1);
      }
    });
  }

  showCategorySelect(): Alert {
    let alert = this.alertController.create();
    this.budget.getCategories('alphabetical').forEach(category => {
      if (!this.parent.data.lines.some(line => line !== this.line && line.categoryId === category.id))
        alert.addInput({type: 'radio', label: category.name, value: category.id.toString(), checked: category.id === this.line.categoryId});
    });

    alert.addButton('Cancel');
    alert.addButton({
      text: 'Ok',
      handler: data => {
        this.line.categoryId = Number(data);
      }
    });

    alert.present();
    return alert;
  }
    
  submit(event: Event) {
    event.preventDefault();
    this.viewCtrl.dismiss();
  }
} 