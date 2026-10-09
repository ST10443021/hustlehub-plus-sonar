import { expect, test, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import apiClient from '../api/client';
import MyGigsPage from '../pages/MyGigsPage';

const gig = { id: 'gig-1', title: 'Logo Design', description: 'Design a useful business logo', category: 'design', price: 100, isActive: true };
const response = (data) => ({ data: { data } });
async function openPage() {
  vi.spyOn(apiClient, 'get').mockResolvedValue(response({ gigs: [gig] }));
  render(<MyGigsPage />);
  await screen.findByTestId('my-gig-item');
  return userEvent.setup();
}

test('prefills the edit form and displays the updated server values without another list request', async () => {
  const put = vi.spyOn(apiClient, 'put').mockResolvedValue(response({ gig: { ...gig, title: 'Updated Logo', price: 250 } }));
  const user = await openPage();
  await user.click(screen.getByRole('button', { name: 'Edit' }));
  expect(screen.getByLabelText('Title')).toHaveValue(gig.title);
  expect(screen.getByLabelText('Title')).toHaveFocus();
  expect(screen.getByLabelText('Category')).toHaveValue(gig.category);
  expect(screen.getByLabelText('Description')).toHaveValue(gig.description);
  expect(screen.getByLabelText('Price (ZAR)')).toHaveValue(100);
  await user.clear(screen.getByLabelText('Title'));
  await user.type(screen.getByLabelText('Title'), 'Updated Logo');
  await user.clear(screen.getByLabelText('Price (ZAR)'));
  await user.type(screen.getByLabelText('Price (ZAR)'), '250');
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByText('Gig updated.')).toBeInTheDocument();
  expect(put).toHaveBeenCalledWith('/gigs/gig-1', { title: 'Updated Logo', description: gig.description, category: 'design', price: 250 });
  expect(screen.getByTestId('my-gig-item')).toHaveTextContent('Updated Logo - R250.00');
  expect(apiClient.get).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Title')).toHaveValue('');
});

test('cancelling editing restores the create form without saving', async () => {
  const put = vi.spyOn(apiClient, 'put'); const user = await openPage();
  await user.click(screen.getByRole('button', { name: 'Edit' }));
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByRole('heading', { name: 'Create a new gig' })).toBeInTheDocument();
  expect(screen.getByLabelText('Title')).toHaveValue('');
  expect(put).not.toHaveBeenCalled();
});

test('invalid edits do not reach the API', async () => {
  const put = vi.spyOn(apiClient, 'put'); const user = await openPage();
  await user.click(screen.getByRole('button', { name: 'Edit' }));
  await user.clear(screen.getByLabelText('Price (ZAR)'));
  await user.type(screen.getByLabelText('Price (ZAR)'), '-1');
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a price');
  expect(put).not.toHaveBeenCalled();
});

test('failed editing preserves changes and allows a successful retry', async () => {
  const put = vi.spyOn(apiClient, 'put').mockRejectedValueOnce({ response: { data: { message: 'Update unavailable.' } } }).mockResolvedValueOnce(response({ gig: { ...gig, title: 'Retry Logo' } }));
  const user = await openPage();
  await user.click(screen.getByRole('button', { name: 'Edit' }));
  await user.clear(screen.getByLabelText('Title')); await user.type(screen.getByLabelText('Title'), 'Retry Logo');
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Update unavailable.');
  expect(screen.getByLabelText('Title')).toHaveValue('Retry Logo');
  expect(screen.getByTestId('my-gig-item')).toHaveTextContent('Logo Design');
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByText('Gig updated.')).toBeInTheDocument();
  expect(put).toHaveBeenCalledTimes(2);
});

test('delete confirmation can be cancelled with Escape without deleting', async () => {
  const remove = vi.spyOn(apiClient, 'delete'); const user = await openPage();
  const trigger = screen.getByRole('button', { name: 'Delete' });
  await user.click(trigger);
  expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' })).toHaveFocus();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus(); expect(remove).not.toHaveBeenCalled();
});

test('confirmed deletion removes the listing and resets its edit form', async () => {
  const remove = vi.spyOn(apiClient, 'delete').mockResolvedValue(response(null)); const user = await openPage();
  await user.click(screen.getByRole('button', { name: 'Edit' }));
  await user.click(screen.getByRole('button', { name: 'Delete' }));
  expect(remove).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Confirm delete' }));
  expect(await screen.findByText('Gig deleted.')).toBeInTheDocument();
  expect(screen.queryByTestId('my-gig-item')).not.toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Title')).toHaveValue('');
  expect(apiClient.get).toHaveBeenCalledTimes(1);
  expect(remove).toHaveBeenCalledWith('/gigs/gig-1');
});

test('failed deletion retains the listing and confirmation for retry', async () => {
  const remove = vi.spyOn(apiClient, 'delete').mockRejectedValueOnce({ response: { data: { message: 'Delete unavailable.' } } }).mockResolvedValueOnce(response(null));
  const user = await openPage(); await user.click(screen.getByRole('button', { name: 'Delete' }));
  await user.click(screen.getByRole('button', { name: 'Confirm delete' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Delete unavailable.');
  expect(screen.getByTestId('my-gig-item')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Confirm delete' }));
  expect(await screen.findByText('Gig deleted.')).toBeInTheDocument();
  expect(remove).toHaveBeenCalledTimes(2);
});

test('blocks duplicate deletion and other actions while the request is pending', async () => {
  let finish;
  const remove = vi.spyOn(apiClient, 'delete').mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const user = await openPage(); await user.click(screen.getByRole('button', { name: 'Delete' }));
  await user.click(screen.getByRole('button', { name: 'Confirm delete' }));
  expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  expect(screen.getByLabelText('Title')).toBeDisabled();
  await user.keyboard('{Escape}'); expect(screen.getByRole('dialog')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Deleting...' }));
  expect(remove).toHaveBeenCalledTimes(1);
  finish(response(null)); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});
