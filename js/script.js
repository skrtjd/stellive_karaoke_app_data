document.addEventListener('DOMContentLoaded', () => {
    fetchNotices();
});

async function fetchNotices() {
    try {
        // 1. JSON 데이터 가져오기
        const response = await fetch('data/notices.json'); // 경로를 본인의 환경에 맞게 수정하세요
        const notices = await response.json();

        // 2. 최신순 정렬 (날짜와 ID 기준)
        notices.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

        renderNotices(notices);
    } catch (error) {
        console.error('공지사항 로드 실패:', error);
        document.getElementById('notice-container').innerHTML = '<p>공지사항을 불러오지 못했습니다.</p>';
    }
}

function renderNotices(notices) {
    const container = document.getElementById('notice-container');
    container.innerHTML = ''; // 초기화

    // 3. 년도/월별로 그룹화하기 위한 변수
    let currentGroup = "";

    notices.forEach(notice => {
        // 날짜에서 년-월 추출 (예: 2026-04)
        const dateObj = new Date(notice.date);
        const yearMonth = `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월`;

        // 4. 새로운 년/월 그룹이 나타나면 헤더 추가
        if (currentGroup !== yearMonth) {
            currentGroup = yearMonth;
            const groupHeader = document.createElement('h2');
            groupHeader.className = 'group-header';
            groupHeader.innerText = `📅 ${yearMonth}`;
            container.appendChild(groupHeader);
        }

        // 5. 공지 아이템 생성
        const noticeCard = document.createElement('div');
        noticeCard.className = 'notice-card';

        // 요청하신 형식: yyyy-mm-dd-hh-mm-ss
        // JSON에 hh-mm-ss 정보가 없다면 현재 시간이나 기본값으로 대체합니다.
        const fullTime = `${notice.date}-00-00-00`; 

        noticeCard.innerHTML = `
            <div class="notice-time">${fullTime}</div>
            <div class="notice-title"><h3>${notice.title}</h3></div>
            <div class="notice-body"><p>${notice.body}</p></div>
        `;
        
        container.appendChild(noticeCard);
    });
}