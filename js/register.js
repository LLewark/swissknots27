// Registration form for Swiss Knots 2027.
// Sends the form to the registration Worker (URL in the form's data-endpoint attribute).
(function () {
	'use strict';

	var PERMANENT = 'Permanent position';
	var MAX_CV_BYTES = 20 * 1024 * 1024;

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
		var details = document.getElementById('funding_details');
		var cvInput = document.getElementById('cv');
		var expensesInput = document.getElementById('expenses_chf');

		// Financial support is only for participants without a permanent position.
		// The CV, expenses and explanation fields are shown (and sent) only while
		// the financial support box is ticked; disabled fields are not submitted.
		function updateFunding() {
			var permanent = stage.value === PERMANENT;
			fundingRow.hidden = permanent;
			fundingBox.disabled = permanent;
			if (permanent) fundingBox.checked = false;

			var applying = fundingBox.checked && !permanent;
			details.hidden = !applying;
			Array.prototype.forEach.call(details.querySelectorAll('input, textarea'), function (el) {
				el.disabled = !applying;
				if (!applying) el.classList.remove('invalid');
			});
			cvInput.required = applying;
			expensesInput.required = applying;
		}
		stage.addEventListener('change', updateFunding);
		fundingBox.addEventListener('change', updateFunding);
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

		function chosenCv() {
			return !cvInput.disabled && cvInput.files && cvInput.files.length ? cvInput.files[0] : null;
		}

		// Returns an error message if the chosen CV is not acceptable, else null.
		function cvProblem() {
			var file = chosenCv();
			if (!file) return null;
			var isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
			if (!isPdf) return 'Please upload your CV as a PDF file.';
			if (file.size > MAX_CV_BYTES) return 'Your CV is larger than 20 MB. Please upload a smaller PDF.';
			return null;
		}

		cvInput.addEventListener('change', function () {
			var problem = cvProblem();
			cvInput.classList.toggle('invalid', !!problem);
			setStatus(problem || '', !!problem);
		});

		// Clear the red marking as soon as a field is edited.
		form.addEventListener('input', function (event) {
			event.target.classList.remove('invalid');
		});
		form.addEventListener('change', function (event) {
			if (event.target !== cvInput) event.target.classList.remove('invalid');
		});

		form.addEventListener('submit', function (event) {
			event.preventDefault();

			// Check required fields ourselves so the messages match the page style.
			var firstInvalid = null;
			Array.prototype.forEach.call(form.querySelectorAll('[required]'), function (el) {
				if (el.disabled) return;
				var ok = el.checkValidity() && el.value.trim() !== '';
				el.classList.toggle('invalid', !ok);
				if (!ok && !firstInvalid) firstInvalid = el;
			});
			if (firstInvalid) {
				var message = 'Please fill in all fields marked with * (and check the email address).';
				if (firstInvalid === cvInput) message = 'Please upload your CV (PDF) to apply for financial support.';
				if (firstInvalid === expensesInput) message = 'Please enter your expected expenses in Swiss francs (a number).';
				setStatus(message, true);
				firstInvalid.focus();
				return;
			}
			var problem = cvProblem();
			if (problem) {
				cvInput.classList.add('invalid');
				setStatus(problem, true);
				cvInput.focus();
				return;
			}

			var data = new FormData(form);
			if (!data.get('cf-turnstile-response')) {
				setStatus('Please complete the captcha above the button.', true);
				return;
			}

			var cvFile = chosenCv();
			button.disabled = true;
			setStatus(cvFile ? 'Sending your registration and uploading your CV…' : 'Sending your registration…', false);

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
					var parts = ['Thank you for registering!'];
					if (result.cv === 'failed') {
						parts.push('Your registration has been received, but we could not store your CV. Please send it to us by email.');
					} else if (result.cv === 'saved') {
						parts.push('Your registration and your CV have been received.');
					}
					if (result.mailed) {
						parts.push('A confirmation email is on its way to ' + email +
							'. If it does not arrive within a few minutes, please check your spam folder.');
					} else {
						parts.push('We could not send the confirmation email to ' + email +
							'. If that address is correct, there is no need to do anything.');
					}
					done.textContent = parts.join(' ');
					done.hidden = false;
					form.hidden = true;
					done.scrollIntoView({ behavior: 'smooth', block: 'center' });
				})
				.catch(function (error) {
					var message = error && error.message ? error.message : 'Registration failed.';
					if (error instanceof TypeError) {
						message = 'Could not reach the registration server. Please check your connection and try again.';
						if (cvFile && cvFile.size > 5 * 1024 * 1024) {
							message += ' Your CV is rather large; if this keeps happening, please try a smaller PDF.';
						}
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
