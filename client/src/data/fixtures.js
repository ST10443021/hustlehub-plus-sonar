// Fictional demo records. These are not accounts, passwords, or MongoDB seed data.
export const demoUsers = [
  { id: 'client-morgan', name: 'Morgan Reed', role: 'client' },
  { id: 'client-casey', name: 'Casey Lane', role: 'client' },
  { id: 'freelancer-alex', name: 'Alex Stone', role: 'freelancer' },
  { id: 'freelancer-jamie', name: 'Jamie Park', role: 'freelancer' },
];

export const sampleGigs = [
  { id: 'gig-logo', freelancerId: 'freelancer-alex', freelancerName: 'Alex Stone', title: 'A logo for your next big idea', description: 'A clean, memorable logo for your small business, with two initial concepts and one revision.', priceCents: 85000, category: 'Design', active: true },
  { id: 'gig-website', freelancerId: 'freelancer-jamie', freelancerName: 'Jamie Park', title: 'A simple business website', description: 'A responsive one-page website that introduces your business and makes it easy for customers to get in touch.', priceCents: 220000, category: 'Development', active: true },
  { id: 'gig-social', freelancerId: 'freelancer-alex', freelancerName: 'Alex Stone', title: 'Social posts that feel like you', description: 'Five reusable social media designs, matched to your colours and brand.', priceCents: 65000, category: 'Design', active: true },
  { id: 'gig-copy', freelancerId: 'freelancer-jamie', freelancerName: 'Jamie Park', title: 'Clear words for your homepage', description: 'Friendly homepage copy that explains what you do and why it matters to your customers.', priceCents: 50000, category: 'Writing', active: true },
  { id: 'gig-cv', freelancerId: 'freelancer-alex', freelancerName: 'Alex Stone', title: 'A fresh layout for your CV', description: 'A neat, readable CV layout that puts your experience and skills first.', priceCents: 35000, category: 'Design', active: true },
  { id: 'gig-data', freelancerId: 'freelancer-jamie', freelancerName: 'Jamie Park', title: 'Tidy up your spreadsheet', description: 'Clean duplicate entries and organise a small spreadsheet into a useful, easy-to-read table.', priceCents: 45000, category: 'Data', active: true },
];

export const sampleBookings = [
  { id: 'booking-1001', gigId: 'gig-logo', gigTitle: 'A logo for your next big idea', clientId: 'client-morgan', clientName: 'Morgan Reed', freelancerId: 'freelancer-alex', freelancerName: 'Alex Stone', amountCents: 85000, currency: 'ZAR', status: 'confirmed', createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'booking-1002', gigId: 'gig-copy', gigTitle: 'Clear words for your homepage', clientId: 'client-casey', clientName: 'Casey Lane', freelancerId: 'freelancer-jamie', freelancerName: 'Jamie Park', amountCents: 50000, currency: 'ZAR', status: 'confirmed', createdAt: '2026-10-02T10:00:00.000Z' },
];

export const sampleTransactions = sampleBookings.map((booking) => ({
  id: `transaction-${booking.id}`, bookingId: booking.id,
  clientId: booking.clientId, freelancerId: booking.freelancerId,
  amountCents: booking.amountCents, currency: 'ZAR', simulated: true,
  createdAt: booking.createdAt,
}));
