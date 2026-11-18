# Anga Seatside Snacks

Build a mobile-first web app prototype called "Anga Seat Order" for Anga Cinemas in Nairobi (venues: Anga Diamond and Anga Sky). A guest who is already seated scans the venue QR code, picks their show and seat, and orders snacks and drinks to their seat. Use mock data only: no backend and no real payments.

Entry (one QR code per venue, not per seat):

- **Scan.** The venue QR opens `/?venue=diamond` or `/?venue=sky`. Without a venue, the landing page shows two large buttons (Anga Diamond, Anga Sky) and a "Try a demo" link that opens Anga Sky straight at step 2.
- **Choose your show** (`/show`). "What are you watching?" lists today's films for the venue with search. Picking a film auto-selects the screening that is on now or starts within 30 minutes; if several match, the guest confirms a showtime; if none, "We can't find a current screening. Please ask a member of staff." The schedule is mocked in `src/lib/schedule.ts`; three demo films always have one, two and zero current screenings.
- **Enter your seat** (`/seat`). Seat grid for the screen (rows A to J, seats 1 to 14) or type a seat like F7; validated against that screen. One seat per order.
- The menu, cart, payment and tracking pages show the film, screen and seat. Every step has a back button and the cart is kept when the show or seat changes.
- The cutoff uses the chosen screening's end time.

Screens:

1. Menu: categories (Popcorn, Drinks, Snacks, Combos), item cards with a name, a placeholder price in KSh, and a quantity stepper. Keep a sticky cart bar at the bottom.

2. Cart: line items, total, a note field ("No ice"), and a "Pay with M-Pesa" button.

3. M-Pesa payment (simulated): phone number field (format 07xx xxx xxx), a "Check your phone" waiting state, then success. Add a toggle in a hidden dev menu to simulate failure, with a clear retry message.

4. Order tracking: Received, Preparing, On its way, Delivered. Include a "Need help?" button and a "Cancel order" button that works only before Preparing.

5. Closed state: if the current time is within 20 minutes of the film end time, show "Ordering has closed for this show" and disable checkout. Make the 20 minutes a single configurable constant.

Staff view at /staff: a live order queue for the cashier. Each card shows venue, screen, film, seat, items, payment status and a button to move the order to the next status. New orders appear at the top. Orders placed in the guest view must appear here (shared local state is fine).

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
