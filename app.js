(() => {
  const toast = document.getElementById('toast');
  let toastTimer;
  function notify(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }
  let selectedRide = {name:'Go Lite', price:3200};
  document.querySelectorAll('.ride-option').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.ride-option').forEach(item => {
        item.classList.remove('selected');
        item.setAttribute('aria-pressed', 'false');
      });
      button.classList.add('selected');
      button.setAttribute('aria-pressed', 'true');
      selectedRide = {name:button.dataset.ride, price:Number(button.dataset.price)};
      document.querySelector('.book-button > span:first-child').textContent = 'Confirm ' + selectedRide.name;
    });
  });
  document.getElementById('bookBtn').addEventListener('click', () => {
    const destination = document.getElementById('destination').value.trim();
    if (!destination) {
      document.getElementById('destination').focus();
      notify('Add your destination to preview this booking. No ride will be dispatched in demo mode.');
      return;
    }
    notify('Demo only: ' + selectedRide.name + ' to ' + destination + ' · illustrative fare ₦' + selectedRide.price.toLocaleString('en-NG') + '. Live booking is not connected yet.');
  });
  document.getElementById('compareBtn').addEventListener('click', () => notify('Choose a ride card to compare illustrative fares and pickup estimates.'));
  document.getElementById('fareInfo').addEventListener('click', () => notify('LagosGo is designed for upfront fare estimates and transparent platform fees. These sample prices are not live quotes.'));
  document.getElementById('locateBtn').addEventListener('click', () => notify('Location access is not connected in this prototype. Enter your pickup manually.'));
  document.getElementById('profileBtn').addEventListener('click', () => notify('Passenger profile and sign-in are planned; accounts are not connected yet.'));
  document.getElementById('driverBtn').addEventListener('click', () => notify('Driver onboarding is on the roadmap, with transparent earnings and verified documents as core requirements.'));
  document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    if (button.dataset.tab !== 'Ride') notify(button.dataset.tab + ' is part of the planned LagosGo experience and is not connected yet.');
  }));
})();