document.addEventListener('DOMContentLoaded', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      throw new Error('No active tab found');
    }

    if (!tab.url?.includes('x.com') && !tab.url?.includes('twitter.com')) {
      document.body.innerHTML = '<p>Это расширение работает только на страницах X (Twitter)</p>';
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: "getStats" }, response => {
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);
        document.body.innerHTML = '<p>Произошла ошибка при получении данных. Попробуйте обновить страницу.</p>';
        return;
      }
      
      if (response?.error) {
        console.error('Response error:', response.error);
        document.body.innerHTML = `<p>Ошибка: ${response.error}</p>`;
        return;
      }

      if (response) {
        updateStats(response.totalStats);
        displayPosts(response.postsData);
      }
    });
  } catch (error) {
    console.error('Error:', error);
    document.body.innerHTML = `<p>Произошла ошибка: ${error.message}</p>`;
  }
});

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function updateStats(totalStats) {
  document.getElementById('total-comments').textContent = formatNumber(totalStats.comments);
  document.getElementById('total-reposts').textContent = formatNumber(totalStats.reposts);
  document.getElementById('total-likes').textContent = formatNumber(totalStats.likes);
  document.getElementById('total-views').textContent = formatNumber(totalStats.views);
}

function displayPosts(posts) {
  const container = document.getElementById('posts-container');
  container.innerHTML = ''; // Очищаем контейнер перед добавлением новых постов
  
  if (posts.length === 0) {
    container.innerHTML = '<p>Посты не найдены</p>';
    return;
  }
  
  posts.forEach(post => {
    const postElement = document.createElement('div');
    postElement.className = 'post';
    postElement.innerHTML = `
      <div class="post-header">
        <span>${post.date}</span>
      </div>
      <p>${post.text}</p>
      <div class="post-stats">
        <span>💬 ${formatNumber(post.comments)}</span>
        <span>🔄 ${formatNumber(post.reposts)}</span>
        <span>❤️ ${formatNumber(post.likes)}</span>
        <span>👁️ ${formatNumber(post.views)}</span>
      </div>
    `;
    container.appendChild(postElement);
  });
} 