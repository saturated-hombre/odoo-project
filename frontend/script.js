document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('contactForm');
  const alertBox = document.getElementById('formAlert');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    alertBox.innerHTML = '';
    const data = {
      name: form.name.value,
      email: form.email.value,
      message: form.message.value
    };
    try {
      const response = await fetch('http://localhost:3000/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        form.reset();
        alertBox.innerHTML = '<div class="alert alert-success">Message sent successfully!</div>';
      } else {
        alertBox.innerHTML = '<div class="alert alert-danger">Failed to send message. Please try again.</div>';
      }
    } catch (err) {
      alertBox.innerHTML = '<div class="alert alert-danger">Error: ' + err.message + '</div>';
    }
  });

  // Chatbot widget logic
  const chatbotToggle = document.getElementById('chatbotToggle');
  const chatbotWidget = document.getElementById('chatbotWidget');
  const chatbotClose = document.getElementById('chatbotClose');
  const chatbotForm = document.getElementById('chatbotForm');
  const chatbotInput = document.getElementById('chatbotInput');
  const chatbotMessages = document.getElementById('chatbotMessages');

  function appendMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chatbot-message ' + sender;
    const bubble = document.createElement('div');
    bubble.className = 'chatbot-bubble';
    bubble.textContent = text;
    msgDiv.appendChild(bubble);
    chatbotMessages.appendChild(msgDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }

  chatbotToggle.addEventListener('click', function () {
    chatbotWidget.style.display = chatbotWidget.style.display === 'none' ? 'flex' : 'none';
    if (chatbotWidget.style.display === 'flex') {
      chatbotInput.focus();
    }
  });
  chatbotClose.addEventListener('click', function () {
    chatbotWidget.style.display = 'none';
  });

  chatbotForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const userMsg = chatbotInput.value.trim();
    if (!userMsg) return;
    appendMessage(userMsg, 'user');
    chatbotInput.value = '';
    appendMessage('...', 'bot'); // loading indicator
    try {
      const response = await fetch('http://localhost:3000/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await response.json();
      // Remove loading indicator
      chatbotMessages.removeChild(chatbotMessages.lastChild);
      if (data.reply) {
        appendMessage(data.reply, 'bot');
      } else {
        appendMessage('Sorry, I did not understand that.', 'bot');
      }
    } catch (err) {
      chatbotMessages.removeChild(chatbotMessages.lastChild);
      appendMessage('Error: ' + err.message, 'bot');
    }
  });
}); 