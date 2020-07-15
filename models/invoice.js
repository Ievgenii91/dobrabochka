module.exports = class InvoiceModel {
    constructor(data) {
        this.recipientAddressDescription = data.RecipientAddressDescription;
        // Відділення №1: вул.
        // Червонопрапорна, 34 (Корчувате)
        this.recipientsPhone = data.RecipientsPhone; // '380978722370'
        this.recipientContactPhone = data.RecipientContactPhone; // '380978722370'
        this.cityRecipientDescription = data.CityRecipientDescription;
        this.recipientContactPerson = data.RecipientContactPerson; //"Гродський Роман Володимирович",
        this.invoiceNumber = data.IntDocNumber;
        this.description = data.Description;
        this.cost = data.Cost;
        this.createdTime = data.CreateTime;
        this.invoiceId = data.Ref;
        this.notified = false;
    }
};
