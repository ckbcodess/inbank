# Update

## Shipped to main (live)

### Icons and look
- Send & Pay hub icons now come from the new icon pack, Reicon
- Dev Mode: switch the hub between Outline, Glass, Duotone and Duotone glass, in GCB amber or coloured by function
- Icon colours are tokens now, with their own group in the colour tuner
- Buttons are semibold 13px, and small buttons next to a primary are now the same size as it
- More vibrant status badges, and each card state has its own colour (nine states, nine hues). There's a badge sheet in `docs/status-badges.html`
- Top bar is translucent and blurs the page as you scroll

### New: Broadband
- New **Broadband** option on the Internet rail: MTN Fibre and TurboNet, and Telecel monthly, One Family and Unlimited plans
- Pick a plan type, then a plan; nothing is preselected
- Internet bundles are no longer preselected anywhere

### Transactions
- Receipt redesigned: type above the amount, date and time under it, status chip first in the list, grouped details with dashed lines
- Share Receipt and Save as PDF, each with a masked version that hides all amounts
- Time of day is now saved with every payment
- List rows show the recipient first, then type, date and status

### Polish
- Title Case for nav, menus, page, modal and tile titles; sentence case for input labels
- Modals use one footer, with buttons on the right (Add Money, link wallet and card, Add Account)
- Sidebar collapse is smooth, with centred icons and no dividers
- Registered and Linked shown as icons; linked numbers use one phone format
- Name enquiry and saved payees use the new names
- Cards page filter is back to the segmented control; avatar hover is a colour shift, not a scale

## Heads up
- Telecel and MTN prices are from news and listing sites. Check them with the providers before launch. Telecel's two middle Flexi-style tiers aren't in, and neither is MTN 5G Home
- Pushed straight to main with no PR, and I didn't run a full-project lint

## Next
- Full icon overhaul (all Lucide to Reicon): waiting on whether to do it all at once or by area
