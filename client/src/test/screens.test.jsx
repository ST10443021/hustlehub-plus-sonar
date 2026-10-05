import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import App from '../App.jsx';
import GigForm from '../pages/muzzi/GigForm.jsx';
import { createMockApi } from '../services/mockApi.js';

it('lets a client confirm a sample service and see it in their bookings', async () => {
  const user = userEvent.setup();
  render(<App api={createMockApi({ latency: 0 })} />);
  const title = await screen.findByRole('heading', { name: 'Social posts that feel like you' });
  await user.click(within(title.closest('article')).getByRole('button', { name: 'View & book' }));
  const dialog = screen.getByRole('dialog');
  await user.click(within(dialog).getByRole('button', { name: 'Confirm booking' }));
  await screen.findByText(/Your demo booking is confirmed/);
  await user.click(screen.getByRole('button', { name: /My bookings/ }));
  expect(await screen.findByRole('heading', { name: 'Social posts that feel like you' })).toBeInTheDocument();
});

it('shows field errors and sends no save request for invalid input', async () => {
  const user = userEvent.setup();
  const save = vi.fn();
  render(<GigForm onSave={save} onCancel={() => {}} />);
  await user.click(screen.getByRole('button', { name: 'Save service' }));
  expect(screen.getAllByRole('alert')).toHaveLength(3);
  expect(save).not.toHaveBeenCalled();
});

it('lets a freelancer add, edit, and remove their own sample service', async () => {
  const user = userEvent.setup();
  render(<App api={createMockApi({ latency: 0 })} />);
  await user.selectOptions(screen.getByLabelText('Demo user'), 'freelancer-alex');
  await screen.findByRole('heading', { name: 'My services' });
  await user.click(screen.getByRole('button', { name: 'Add service' }));
  await user.type(screen.getByLabelText('Service title'), 'New sample service');
  await user.type(screen.getByLabelText('Description'), 'A useful sample service description.');
  await user.type(screen.getByLabelText('Price (ZAR)'), '123.45');
  await user.click(screen.getByRole('button', { name: 'Save service' }));
  let heading = await screen.findByRole('heading', { name: 'New sample service' });
  await user.click(within(heading.closest('article')).getByRole('button', { name: 'Edit' }));
  await user.clear(screen.getByLabelText('Service title'));
  await user.type(screen.getByLabelText('Service title'), 'Updated sample service');
  await user.click(screen.getByRole('button', { name: 'Save service' }));
  heading = await screen.findByRole('heading', { name: 'Updated sample service' });
  await user.click(within(heading.closest('article')).getByRole('button', { name: 'Delete' }));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove service' }));
  await screen.findByText('Your demo service has been removed.');
  expect(screen.queryByRole('heading', { name: 'Updated sample service' })).not.toBeInTheDocument();
});
