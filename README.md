# Anga Seatside Snacks

Build a mobile-first web app prototype called "Anga Seat Order" for Anga Cinemas in Nairobi (venues: Anga Diamond and Anga Sky). A guest who is already seated scans a seat code and orders snacks and drinks to their seat. Use mock data only: no backend and no real payments.

Entry: the app opens from a URL like /?venue=sky&screen=2&seat=F7&end=21:45. Show a confirmation screen with venue, screen, seat and the film end time, and a button "Start order".

Screens:

1. Menu: categories (Popcorn, Drinks, Snacks, Combos), item cards with a name, a placeholder price in KSh, and a quantity stepper. Keep a sticky cart bar at the bottom.

2. Cart: line items, total, a note field ("No ice"), and a "Pay with M-Pesa" button.

3. M-Pesa payment (simulated): phone number field (format 07xx xxx xxx), a "Check your phone" waiting state, then success. Add a toggle in a hidden dev menu to simulate failure, with a clear retry message.

4. Order tracking: Received, Preparing, On its way, Delivered. Include a "Need help?" button and a "Cancel order" button that works only before Preparing.

5. Closed state: if the current time is within 20 minutes of the film end time, show "Ordering has closed for this show" and disable checkout. Make the 20 minutes a single configurable constant.

Staff view at /staff: a live order queue for the cashier. Each card shows seat, items, payment status and a button to move the order to the next status. New orders appear at the top. Orders placed in the guest view must appear here (shared local state is fine).

Design: dark theme by default, low brightness and high contrast so it doesn't light up a dark auditorium. Large tap targets, no animations that flash, no sound, plain English, Kenyan shilling formatting. Label all prices as placeholders. Accessible labels on all controls. Use a neutral cinema look with a single warm accent colour.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://anga-seatside-snacks.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5f59ca83-6929-5f81-b428-c08c6790997b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
