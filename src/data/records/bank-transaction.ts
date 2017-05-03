import {Record} from '../../db/record';

export class BankTransaction extends Record<BankTransaction> {
    
    public id: number;
    public description: string;
    public date: string;
    public amount: BigJsLibrary.BigJS;
    public status: 'recent' | 'authorised' | 'processed';
    public accountId: number;

    tableName(): string {
        return 'BankTransaction';
    }

    initTable(table: LokiCollection<BankTransaction>) {
        table.ensureUniqueIndex('id');
    }
    
    tableCreationOptions(): any {
        //return {'indices': ['categoryId']};
    }
}