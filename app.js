(function () {
  // API 경로 설정 - 여러 경로 시도
  // ⚠️ 중요: macOS에서 포트 5000은 Apple AirPlay가 사용할 수 있습니다
  // 백엔드 서버가 다른 포트에서 실행 중일 수 있습니다
  const POSSIBLE_PORTS = [5003, 5000, 3000, 3001, 5001, 8000]; // 5003을 맨 앞에 배치
  const POSSIBLE_PATHS = ['/api/todos', '/todos', '/api/v1/todos'];
  
  // 현재 설정된 포트 (기본값)
  let currentPort = POSSIBLE_PORTS[0];
  let API_BASE = `http://localhost:${currentPort}`;
  
  // API Base URL (동적으로 결정됨)
  let API_BASE_URL = API_BASE + POSSIBLE_PATHS[0];
  
  // API 연결 테스트 및 올바른 경로 찾기
  console.log('🔍 API 연결 경로 찾는 중...');
  console.log('⚠️ 참고: 포트 5000이 Apple AirPlay에 사용 중일 수 있습니다');

  const formEl = document.getElementById('todo-form');
  const inputEl = document.getElementById('todo-input');
  const listEl = document.getElementById('todo-list');
  const templateEl = document.getElementById('todo-item-template');

  /** @type {{ id: string, text: string, createdAt?: Date }[]} */
  let todos = [];
  
  // API 경로 자동 감지 함수
  async function detectApiPath() {
    for (const path of POSSIBLE_PATHS) {
      const testUrl = API_BASE + path;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        const response = await fetch(testUrl, {
          method: 'GET',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok || response.status === 404) {
          // 404도 서버가 응답한 것이므로 경로는 맞지만 리소스가 없는 경우
          console.log(`✅ API 경로 발견: ${testUrl}`);
          return testUrl;
        }
      } catch (error) {
        // 이 경로는 작동하지 않음, 다음 경로 시도
        continue;
      }
    }
    
    // 모든 경로 실패
    console.error('❌ 모든 API 경로 시도 실패');
    return null;
  }

  // 백엔드 응답을 앱 데이터 구조로 변환
  function mapBackendToApp(backendTodo) {
    return {
      id: backendTodo._id || backendTodo.id,
      text: backendTodo.title || backendTodo.text || '',
      createdAt: backendTodo.createdAt ? new Date(backendTodo.createdAt) : new Date()
    };
  }

  // 앱 데이터 구조를 백엔드 요청 형식으로 변환
  function mapAppToBackend(text) {
    return {
      title: text,
      priority: 'medium'
    };
  }

  // 백엔드 서버 연결 테스트 및 포트 자동 감지
  async function testServerConnection() {
    // 여러 포트 시도
    for (const port of POSSIBLE_PORTS) {
      try {
        const testUrl = `http://localhost:${port}`;
        console.log(`🔍 포트 ${port} 테스트 중:`, testUrl);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        const response = await fetch(testUrl, {
          method: 'GET',
          mode: 'cors',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const serverHeader = response.headers.get('server') || '';
        const contentType = response.headers.get('content-type') || '';
        
        console.log(`📊 포트 ${port} 응답:`, {
          status: response.status,
          statusText: response.statusText,
          server: serverHeader,
          contentType: contentType
        });
        
        // AirPlay 서비스 감지 (AirTunes 서버 헤더)
        if (serverHeader.includes('AirTunes') || serverHeader.includes('AirPlay')) {
          console.warn(`⚠️ 포트 ${port}는 Apple AirPlay 서비스가 사용 중입니다`);
          continue; // 다음 포트 시도
        }
        
        // 일반적인 웹 서버 응답 또는 CORS 헤더 확인
        if (response.ok || response.status < 500 || contentType.includes('json') || contentType.includes('html')) {
          // CORS 헤더 확인
          const corsOrigin = response.headers.get('access-control-allow-origin');
          const corsMethods = response.headers.get('access-control-allow-methods');
          
          if (corsOrigin || corsMethods || response.status === 404) {
            // CORS 헤더가 있거나 404면 서버가 응답한 것 (라우트 문제일 수 있음)
            console.log(`✅ 포트 ${port}에서 백엔드 서버 발견!`);
            currentPort = port;
            API_BASE = `http://localhost:${port}`;
            return true;
          }
        }
        
        // 403은 AirPlay일 가능성이 높음, 다른 포트 시도
        if (response.status === 403 && serverHeader.includes('AirTunes')) {
          console.warn(`⚠️ 포트 ${port}는 AirPlay에 사용 중입니다`);
          continue;
        }
        
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log(`⏱️ 포트 ${port} 연결 타임아웃`);
        } else {
          console.log(`❌ 포트 ${port} 연결 실패:`, error.message);
        }
        continue; // 다음 포트 시도
      }
    }
    
    console.error('❌ 모든 포트에서 백엔드 서버를 찾을 수 없습니다');
    console.error('💡 백엔드 서버가 실행 중인지, 그리고 어떤 포트에서 실행 중인지 확인하세요');
    return false;
  }
  
  // OPTIONS (Preflight) 요청 직접 테스트
  async function testPreflightRequest() {
    try {
      console.log('🔍 Preflight 요청 테스트 중...');
      
      const response = await fetch(API_BASE_URL, {
        method: 'OPTIONS',
        mode: 'cors',
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });
      
      console.log('📊 Preflight 응답:', {
        status: response.status,
        statusText: response.statusText,
        headers: {
          'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
          'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
          'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
          'access-control-max-age': response.headers.get('access-control-max-age')
        }
      });
      
      if (response.status === 403 || response.status === 405) {
        console.error('❌ Preflight 요청이 차단되었습니다:', response.status);
        return false;
      }
      
      return response.status === 200 || response.status === 204;
    } catch (error) {
      console.error('❌ Preflight 테스트 실패:', error);
      return false;
    }
  }

  async function fetchTodos() {
    // API 경로가 설정되지 않았다면 먼저 감지
    if (!API_BASE_URL || API_BASE_URL === API_BASE + POSSIBLE_PATHS[0]) {
      const detectedPath = await detectApiPath();
      if (detectedPath) {
        API_BASE_URL = detectedPath;
        console.log('✅ 사용할 API 경로:', API_BASE_URL);
      } else {
        console.error('❌ API 경로를 찾을 수 없습니다. 백엔드 서버를 확인하세요.');
        showConnectionError();
        return;
      }
    }
    
    try {
      console.log('📡 할일 조회 시도:', API_BASE_URL);
      const response = await fetch(API_BASE_URL, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📥 응답 상태:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 응답 본문:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ 응답 데이터:', result);
      
      if (result.success && Array.isArray(result.data)) {
        todos = result.data.map(mapBackendToApp);
        // createdAt 기준 내림차순 정렬 (최신순)
        todos.sort((a, b) => {
          const timeA = a.createdAt ? a.createdAt.getTime() : 0;
          const timeB = b.createdAt ? b.createdAt.getTime() : 0;
          return timeB - timeA;
        });
        renderTodos();
      } else {
        console.error('⚠️ 할일 조회 실패:', result.message);
        console.error('응답 구조:', result);
      }
    } catch (error) {
      console.error('할일 조회 오류:', error);
      console.error('에러 타입:', error.constructor.name);
      console.error('에러 메시지:', error.message);
      console.error('전체 에러 객체:', error);
      
      // Failed to fetch 에러 처리
      if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
        showConnectionError(error);
      }
    }
  }
  
  // 연결 에러 표시 함수
  function showConnectionError(error = null) {
    const currentUrl = window.location.href;
    const isFileProtocol = currentUrl.startsWith('file://');
    
    let errorMsg = `❌ 백엔드 서버 연결 실패\n\n`;
    
    if (isFileProtocol) {
      errorMsg += `🔴 중요한 문제 발견!\n`;
      errorMsg += `현재 파일이 file:// 프로토콜로 열려있습니다.\n`;
      errorMsg += `CORS 정책 때문에 file://에서는 백엔드 서버에 연결할 수 없습니다.\n\n`;
      errorMsg += `✅ 해결 방법:\n`;
      errorMsg += `1. 터미널에서 프로젝트 폴더로 이동\n`;
      errorMsg += `2. 다음 명령 실행: python3 -m http.server 8000\n`;
      errorMsg += `3. 브라우저에서 http://localhost:8000 접속\n\n`;
    } else {
      // 403 Forbidden 또는 CORS 에러인 경우
      errorMsg += `🔴 백엔드 서버 연결 실패\n\n`;
      errorMsg += `⚠️ 중요한 발견: 포트 5000이 Apple AirPlay 서비스에 사용 중일 수 있습니다!\n`;
      errorMsg += `macOS에서는 포트 5000이 AirPlay Receiver에 기본으로 할당됩니다.\n\n`;
      errorMsg += `✅ 해결 방법:\n\n`;
      errorMsg += `방법 1: 백엔드 서버 포트 변경\n`;
      errorMsg += `   백엔드 서버를 다른 포트(예: 3000, 3001, 5001)로 실행하세요.\n\n`;
      errorMsg += `방법 2: 백엔드 서버 확인\n`;
      errorMsg += `   1. 백엔드 서버가 실제로 실행 중인지 확인\n`;
      errorMsg += `   2. 어떤 포트에서 실행 중인지 확인\n`;
      errorMsg += `   3. 터미널에서: netstat -an | grep LISTEN\n\n`;
      errorMsg += `방법 3: AirPlay 비활성화 (선택사항)\n`;
      errorMsg += `   시스템 설정 > AirPlay Receiver를 끄세요.\n\n`;
      errorMsg += `📋 추가 확인 사항:\n\n`;
      errorMsg += `1. CORS 설정 순서 확인\n`;
      errorMsg += `   app.use(cors()) 가 반드시 모든 라우트보다 위에 있어야 합니다!\n\n`;
      errorMsg += `2. 올바른 코드 순서:\n`;
      errorMsg += `   const express = require('express');\n`;
      errorMsg += `   const cors = require('cors');\n`;
      errorMsg += `   const app = express();\n\n`;
      errorMsg += `   // ✅ CORS는 맨 먼저\n`;
      errorMsg += `   app.use(cors({\n`;
      errorMsg += `     origin: '*',\n`;
      errorMsg += `     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],\n`;
      errorMsg += `     allowedHeaders: ['Content-Type']\n`;
      errorMsg += `   }));\n\n`;
      errorMsg += `   app.use(express.json());\n\n`;
      errorMsg += `   // ✅ 라우트는 나중에\n`;
      errorMsg += `   app.use('/api/todos', todoRoutes);\n\n`;
      errorMsg += `3. 인증 미들웨어 확인\n`;
      errorMsg += `   인증 미들웨어가 OPTIONS 요청을 차단하지 않는지 확인하세요.\n`;
      errorMsg += `   예: if (req.method === 'OPTIONS') return res.sendStatus(200);\n\n`;
      errorMsg += `4. 서버 재시작 확인\n`;
      errorMsg += `   코드 변경 후 반드시 서버를 재시작했는지 확인하세요.\n\n`;
      errorMsg += `5. 브라우저 콘솔 확인\n`;
      errorMsg += `   F12를 눌러 콘솔의 상세 에러를 확인하세요.\n\n`;
    }
    
    errorMsg += `🔍 현재 설정:\n`;
    errorMsg += `- API Base URL: ${API_BASE}\n`;
    errorMsg += `- API Full URL: ${API_BASE_URL}\n`;
    errorMsg += `- 현재 포트: ${currentPort}\n`;
    errorMsg += `- 프론트엔드: ${currentUrl}\n`;
    if (error) {
      errorMsg += `- 에러: ${error.message}\n`;
    }
    errorMsg += `\n💡 브라우저 콘솔(F12)에서 "사용할 백엔드 URL"을 확인하세요.`;
    
    console.error('🚨 연결 에러 상세:', {
      error: error?.message,
      apiUrl: API_BASE_URL,
      currentUrl: currentUrl,
      isFileProtocol: isFileProtocol
    });
    
    console.error('🔧 백엔드 CORS 설정 예시:');
    console.error(`
const cors = require('cors');
app.use(cors({
  origin: '*',  // 개발 환경용 (프로덕션에서는 특정 URL 지정)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
    `);
    
    alert(errorMsg);
  }

  function renderTodos() {
    listEl.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (const item of todos) {
      const node = templateEl.content.firstElementChild.cloneNode(true);
      node.dataset.id = item.id;

      const textSpan = node.querySelector('.todo-item__text');
      const editInput = node.querySelector('.todo-item__edit-input');
      const editBtn = node.querySelector('.js-edit');
      const saveBtn = node.querySelector('.js-save');
      const cancelBtn = node.querySelector('.js-cancel');
      const deleteBtn = node.querySelector('.js-delete');

      textSpan.textContent = item.text;
      editInput.value = item.text;

      editBtn.addEventListener('click', () => startEditing(node));
      saveBtn.addEventListener('click', () => saveEditing(node));
      cancelBtn.addEventListener('click', () => cancelEditing(node));
      deleteBtn.addEventListener('click', () => deleteTodo(node));

      editInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); saveEditing(node); }
        if (e.key === 'Escape') { e.preventDefault(); cancelEditing(node); }
      });

      frag.appendChild(node);
    }
    listEl.appendChild(frag);
  }

  function startEditing(node) {
    node.classList.add('editing');
    const input = node.querySelector('.todo-item__edit-input');
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  async function saveEditing(node) {
    const id = node.dataset.id;
    const input = node.querySelector('.todo-item__edit-input');
    const newText = input.value.trim();
    if (!newText) {
      // 빈 문자열은 편집 취소로 간주
      cancelEditing(node);
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newText
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        await fetchTodos(); // 목록 새로고침
      } else {
        console.error('할일 수정 실패:', result.message);
        alert('할일 수정에 실패했습니다: ' + result.message);
      }
    } catch (error) {
      console.error('할일 수정 오류:', error);
      if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
        alert('백엔드 서버에 연결할 수 없습니다. CORS 설정을 확인해주세요.');
      } else {
        alert('할일 수정 중 오류가 발생했습니다.');
      }
    }
  }

  function cancelEditing(node) {
    node.classList.remove('editing');
    const id = node.dataset.id;
    const todo = todos.find((t) => t.id === id);
    const input = node.querySelector('.todo-item__edit-input');
    input.value = todo ? todo.text : '';
  }

  async function deleteTodo(node) {
    const id = node.dataset.id;
    
    if (!confirm('정말 삭제하시겠습니까?')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        await fetchTodos(); // 목록 새로고침
      } else {
        console.error('할일 삭제 실패:', result.message);
        alert('할일 삭제에 실패했습니다: ' + result.message);
      }
    } catch (error) {
      console.error('할일 삭제 오류:', error);
      if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
        alert('백엔드 서버에 연결할 수 없습니다. CORS 설정을 확인해주세요.');
      } else {
        alert('할일 삭제 중 오류가 발생했습니다.');
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;
    
    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mapAppToBackend(text))
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        inputEl.value = '';
        inputEl.focus();
        await fetchTodos(); // 목록 새로고침
      } else {
        console.error('할일 생성 실패:', result.message);
        alert('할일 생성에 실패했습니다: ' + result.message);
      }
    } catch (error) {
      console.error('할일 생성 오류:', error);
      if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
        alert('백엔드 서버에 연결할 수 없습니다. localhost:5000이 실행 중인지 확인해주세요.\n또한 백엔드에서 CORS를 허용하도록 설정되어 있는지 확인해주세요.');
      } else {
        alert('할일 생성 중 오류가 발생했습니다.');
      }
    }
  }

  async function init() {
    // 현재 프로토콜 확인
    const currentUrl = window.location.href;
    const isFileProtocol = currentUrl.startsWith('file://');
    
    if (isFileProtocol) {
      console.warn('⚠️ WARNING: 파일이 file:// 프로토콜로 열려있습니다.');
      console.warn('⚠️ CORS 정책 때문에 백엔드 서버에 연결할 수 없습니다.');
      console.warn('💡 해결: 웹 서버로 실행하세요 (python3 -m http.server 8000)');
      showConnectionError();
      return;
    }
    
    console.log('🚀 앱 초기화 시작...');
    console.log('📍 프론트엔드 URL:', currentUrl);
    console.log('📍 백엔드 URL:', API_BASE);
    
    // 서버 연결 상태 확인
    console.log('🔍 1단계: 백엔드 서버 연결 확인 중...');
    const isConnected = await testServerConnection();
    
    if (!isConnected) {
      console.error('❌ 백엔드 서버에 연결할 수 없습니다.');
      console.error('💡 확인 사항:');
      console.error('   1. 백엔드 서버가 실행 중인지 확인');
      console.error('   2. 백엔드 서버가 어떤 포트에서 실행 중인지 확인 (5000, 3000, 8000 등)');
      console.error('   3. 포트 5000이 Apple AirPlay에 사용 중일 수 있습니다 (macOS)');
      showConnectionError();
      return;
    } else {
      console.log(`✅ 백엔드 서버 연결 확인됨 (포트 ${currentPort})`);
      console.log(`📍 사용할 백엔드 URL: ${API_BASE}`);
    }
    
    // Preflight 요청 테스트
    console.log('🔍 2단계: Preflight (OPTIONS) 요청 테스트 중...');
    const preflightOk = await testPreflightRequest();
    
    if (!preflightOk) {
      console.error('❌ Preflight 요청 실패 - CORS 설정 문제입니다!');
      console.error('💡 백엔드에서 다음을 확인하세요:');
      console.error('   1. app.use(cors()) 가 모든 라우트보다 위에 있는지');
      console.error('   2. OPTIONS 메서드가 허용되어 있는지');
      console.error('   3. 인증 미들웨어가 OPTIONS 요청을 차단하지 않는지');
      showConnectionError();
      return;
    } else {
      console.log('✅ Preflight 요청 성공 - CORS 설정 정상');
    }
    
    // API 경로 자동 감지
    console.log('🔍 3단계: API 경로 자동 감지 중...');
    const detectedPath = await detectApiPath();
    if (detectedPath) {
      API_BASE_URL = detectedPath;
      console.log('✅ 사용할 API 경로:', API_BASE_URL);
    } else {
      console.error('❌ API 경로를 찾을 수 없습니다.');
      console.error('💡 백엔드 라우트 경로를 확인하세요 (예: /api/todos 또는 /todos)');
      showConnectionError();
      return;
    }
    
    // 할일 목록 로드
    console.log('🔍 4단계: 할일 목록 로드 중...');
    await fetchTodos();
    
    // 폼 이벤트 등록
    formEl.addEventListener('submit', handleSubmit);
    
    console.log('✅ 앱 초기화 완료');
  }

  init();
})();


