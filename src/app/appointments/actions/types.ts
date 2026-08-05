export interface ActionResult {
  error?: string
}

export interface BillingActionResult extends ActionResult {
  checkoutUrl?: string
}
