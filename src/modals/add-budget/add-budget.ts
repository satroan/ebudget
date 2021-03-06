import {ViewController, NavParams} from 'ionic-angular';
import {Component} from '@angular/core';
import { Autofocus } from "../../services/autofocus";

@Component({
  templateUrl: 'add-budget.html'
})
export class AddBudgetModal {
  editing: boolean;
  budgetName: string;
  
  constructor(public viewCtrl: ViewController, private navParams: NavParams, public autofocus: Autofocus) {
    this.viewCtrl = viewCtrl;

    if (navParams.data && navParams.data.budgetName) {
      this.editing = true;
      this.budgetName = navParams.data.budgetName;
    } else {
      this.editing = false;
    }


    
  }
  
  submit(event: Event) {
    this.viewCtrl.dismiss({'budgetName': this.budgetName});
    event.preventDefault();
  }
  
  cancel() {
    this.viewCtrl.dismiss();    
  }
} 