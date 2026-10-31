# Algorithms used

## Conflict filter
For revised examination completion date E and buffer B, the earliest allowed departure is E + B days. A candidate is eligible only if its local departure date is on or after that date.

## Additional payment (prototype assumption)
`max(0, newFare + changeFee - eligibleTicketCredit)`. Real airline policies may calculate fare differences, refunds, credits, and fees differently; this is only a configurable demo rule.

## Recommendation score
The current Java sample combines a normalized additional-payment score and a flexibility score. It filters hard constraints first. A production system should normalize all criteria carefully and let users adjust preferences.

## Machine learning
The separate Python service trains a Linear Regression model on synthetic educational data. It reports MAE and RMSE, but metrics on synthetic data do not establish real-world predictive accuracy.
