// Функция для ожидания загрузки элементов
function waitForElements(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    if (document.querySelectorAll(selector).length > 0) {
      return resolve(document.querySelectorAll(selector));
    }

    const observer = new MutationObserver((mutations) => {
      if (document.querySelectorAll(selector).length > 0) {
        observer.disconnect();
        resolve(document.querySelectorAll(selector));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      resolve(document.querySelectorAll(selector));
    }, timeout);
  });
}

function collectPostsData() {
  return new Promise(async (resolve) => {
    // Ждем загрузки твитов
    const posts = await waitForElements('article[data-testid="tweet"]');
    console.log('Found posts:', posts.length);
    
    if (posts.length === 0) {
      console.log('No posts found');
      resolve({ postsData: [], totalStats: { comments: 0, reposts: 0, likes: 0, views: 0 } });
      return;
    }

    const processedTweets = new Set();
    const postsData = [];
    let totalStats = {
      comments: 0,
      reposts: 0,
      likes: 0,
      views: 0
    };

    posts.forEach((post, index) => {
      // Получаем уникальный идентификатор твита
      const tweetId = post.querySelector('time')?.dateTime;
      
      if (!tweetId || processedTweets.has(tweetId)) {
        return;
      }
      processedTweets.add(tweetId);

      console.log(`\nAnalyzing post ${index + 1}`);

      // Проверяем тип твита
      const tweetType = getTweetType(post);
      console.log('Tweet type:', tweetType);

      if (tweetType !== 'original') {
        console.log('Skipping non-original tweet');
        return;
      }

      // Получаем метрики
      const metrics = {
        comments: post.querySelector('[data-testid="reply"] span[data-testid="app-text-transition-container"]')?.textContent,
        reposts: post.querySelector('[data-testid="retweet"] span[data-testid="app-text-transition-container"]')?.textContent,
        likes: post.querySelector('[data-testid="like"] span[data-testid="app-text-transition-container"]')?.textContent,
        views: post.querySelector('a[href*="/analytics"] span[data-testid="app-text-transition-container"]')?.textContent
      };
      
      console.log('Raw metrics:', metrics);

      const timestamp = post.querySelector('time')?.dateTime;
      const text = post.querySelector('div[data-testid="tweetText"]')?.textContent || '';
      
      const postStats = {
        date: timestamp ? new Date(timestamp).toLocaleDateString() : '',
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        comments: parseMetric(metrics.comments),
        reposts: parseMetric(metrics.reposts),
        likes: parseMetric(metrics.likes),
        views: parseMetric(metrics.views)
      };

      console.log('Processed stats:', postStats);

      totalStats.comments += postStats.comments;
      totalStats.reposts += postStats.reposts;
      totalStats.likes += postStats.likes;
      totalStats.views += postStats.views;

      postsData.push(postStats);
    });

    resolve({ postsData, totalStats });
  });
}

function getTweetType(post) {
  // Проверяем все возможные элементы socialContext
  const socialContexts = post.querySelectorAll('[data-testid="socialContext"]');
  console.log('Social contexts found:', socialContexts.length);

  for (const context of socialContexts) {
    const text = context?.textContent || '';
    console.log('Checking context:', text);

    if (text.includes('reposted') || text.includes('Ретвитнул')) {
      return 'repost';
    }
    if (text.includes('Pinned') || text.includes('Закреплено')) {
      return 'pinned';
    }
  }

  // Проверяем, является ли твит частью треда
  const tweetText = post.querySelector('[data-testid="tweetText"]')?.textContent || '';
  const tweetContainer = post.closest('div[data-testid="cellInnerDiv"]');
  const prevElement = tweetContainer?.previousElementSibling;
  
  // Если есть номер в начале твита (например "10. FreeCash") - это часть треда
  if (/^\d+\.\s/.test(tweetText)) {
    return 'thread_reply';
  }
  
  // Если предыдущего твита нет или он от другого автора - это начало треда
  if (!prevElement || 
      prevElement.querySelector('[data-testid="User-Name"] a')?.getAttribute('href') !== 
      post.querySelector('[data-testid="User-Name"] a')?.getAttribute('href')) {
    return 'thread';
  }

  return 'thread_reply';
}

function parseMetric(metric) {
  if (!metric) return 0;
  
  // Удаляем пробелы и преобразуем в строку
  metric = String(metric).trim();
  
  // Логируем для отладки
  console.log('Parsing metric:', metric);

  if (metric.includes('K')) {
    return parseFloat(metric.replace('K', '')) * 1000;
  } else if (metric.includes('M')) {
    return parseFloat(metric.replace('M', '')) * 1000000;
  } else if (metric.includes(',')) {
    return parseInt(metric.replace(',', '')) || 0;
  }
  
  return parseInt(metric) || 0;
}

// Обновляем обработчик сообщений
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getStats") {
    console.log('Starting data collection...');
    
    collectPostsData()
      .then(data => {
        console.log('Data collection completed:', data);
        sendResponse(data);
      })
      .catch(error => {
        console.error('Error:', error);
        sendResponse({ error: error.message });
      });
    
    return true; // Важно для асинхронного ответа
  }
});

// Добавляем обработчик ошибок
window.addEventListener('error', function(event) {
  console.error('Content script error:', event.error);
}); 