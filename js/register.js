// Registration form for Swiss Knots 2027.
// Sends the form to the registration Worker (URL in the form's data-endpoint attribute).
(function () {
	'use strict';

	var PERMANENT = 'Permanent position';

	function init() {
		var form = document.getElementById('regform');
		if (!form) return;

		var endpoint = form.getAttribute('data-endpoint');
		var status = document.getElementById('formstatus');
		var button = document.getElementById('submit');
		var done = document.getElementById('regdone');
		var stage = document.getElementById('career_stage');
		var fundingRow = document.getElementById('funding_row');
		var fundingBox = fundingRow.querySelector('input');

		// Financial support is only for participants without a permanent position.
		function updateFunding() {
			var permanent = stage.value === PERMANENT;
			fundingRow.hidden = permanent;
			fundingBox.disabled = permanent;
			if (permanent) fundingBox.checked = false;
		}
		stage.addEventListener('change', updateFunding);
		updateFunding();

		function setStatus(message, isError) {
			status.textContent = message;
			status.className = isError ? 'error' : '';
		}

		function resetCaptcha() {
			if (window.turnstile) {
				try { window.turnstile.reset(); } catch (e) { /* widget not rendered yet */ }
			}
		}

		// Clear the red marking as soon as a field is edited.
		form.addEventListener('input', function (event) {
			event.target.classList.remove('invalid');
		});
		form.addEventListener('change', function (event) {
			event.target.classList.remove('invalid');
		});

		form.addEventListener('submit', function (event) {
			event.preventDefault();

			// Check required fields ourselves so the messages match the page style.
			var firstInvalid = null;
			Array.prototype.forEach.call(form.querySelectorAll('[required]'), function (el) {
				var ok = el.checkValidity() && el.value.trim() !== '';
				el.classList.toggle('invalid', !ok);
				if (!ok && !firstInvalid) firstInvalid = el;
			});
			if (firstInvalid) {
				setStatus('Please fill in all fields marked with * (and check the email address).', true);
				firstInvalid.focus();
				return;
			}

			var data = new FormData(form);
			if (!data.get('cf-turnstile-response')) {
				setStatus('Please complete the captcha above the button.', true);
				return;
			}

			button.disabled = true;
			setStatus('Sending your registration…', false);

			fetch(endpoint, { method: 'POST', body: data })
				.then(function (response) {
					return response.json().catch(function () {
						return { ok: false, error: 'Unexpected response from the server (status ' + response.status + ').' };
					});
				})
				.then(function (result) {
					if (!result.ok) {
						throw new Error(result.error || 'Registration failed.');
					}
					var email = String(data.get('email'));
					var text;
					if (result.mailed) {
						text = 'Thank you for registering! A confirmation email is on its way to ' + email +
							'. If it does not arrive within a few minutes, please check your spam folder.';
					} else {
						text = 'Thank you for registering! Your registration has been received, but we could not send the ' +
							'confirmation email to ' + email + '. If that address is correct, there is no need to do anything.';
					}
					done.textContent = text;
					done.hidden = false;
					form.hidden = true;
					done.scrollIntoView({ behavior: 'smooth', block: 'center' });
				})
				.catch(function (error) {
					var message = error && error.message ? error.message : 'Registration failed.';
					if (error instanceof TypeError) {
						message = 'Could not reach the registration server. Please check your connection and try again.';
					}
					setStatus(message + ' If the problem persists, please contact us by email.', true);
					button.disabled = false;
					resetCaptcha();
				});
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
