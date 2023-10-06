import { Router } from 'express';
import { create, list, remove, retrieve, retrieveCustomerByParams, update,add_customer_to_stripe,add_card_to_customer,get_stripe_customer_cards ,charge_money_from_customer,retrieve_charge_from_stripe,update_default_card_customer,remove_customer_card,getCustomerSubscription,meeting_closed_emails,check_organisation_subscription,check_card_validation,card_pre_authorization,take_charge_from_customer,handleReferalDiscount,deductOrRefundHoldedAmount,holdChargeFromCustomer} from '../controllers/CustomerController';
const customerRouter = Router();

customerRouter.get('/', list);
customerRouter.post('/', create);
customerRouter.get('/:id', retrieve);
customerRouter.put('/:id', update);
customerRouter.delete('/:id', remove);
customerRouter.post('/retrieveCustomerByParams', retrieveCustomerByParams);
customerRouter.post('/add-customer-to-stripe', add_customer_to_stripe);
customerRouter.post('/add-card-to-customer', add_card_to_customer);
customerRouter.post('/get-stripe-customer-cards', get_stripe_customer_cards);
customerRouter.post('/charge-customer', charge_money_from_customer);
customerRouter.post('/retrieve-charge', retrieve_charge_from_stripe);
customerRouter.post('/update-default-card', update_default_card_customer);
customerRouter.post('/remove-customer-card', remove_customer_card);
customerRouter.post('/getCustomerSubscription',getCustomerSubscription)
customerRouter.post('/meeting-closed-emails', meeting_closed_emails);
customerRouter.post('/check-organisation-subscription', check_organisation_subscription);
customerRouter.post('/check-card-validation', check_card_validation);
customerRouter.post('/card-pre-authorization', card_pre_authorization);
customerRouter.post('/take-charge-from-customer', take_charge_from_customer);
customerRouter.post('/handle-referal-discount', handleReferalDiscount);
customerRouter.post('/hold-charge-from-customer',holdChargeFromCustomer);
customerRouter.post('/deduct-or-refund-holded-money',deductOrRefundHoldedAmount);

export default customerRouter;
