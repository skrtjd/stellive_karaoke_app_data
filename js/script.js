document.addEventListener('DOMContentLoaded', () => {
    fetchNotices();
});

async function fetchNotices() {
    try {
        // 1. JSON 데이터 가져오기 (GitHub Pages 등 상대 경로)
        const response = await fetch('assets/data/notices.json'); 
        if (!response.ok) throw new Error('네트워크 응답 에러');
        const notices = await response.json();

        // 2. 최신순 정렬 (문자열 내림차순 정렬만으로도 날짜순 정렬이 됩니다)
        notices.sort((a, b) => b.date.localeCompare(a.date));

        renderNotices(notices);
    } catch (error) {
        console.error('로드 실패:', error);
        document.getElementById('notice-container').innerHTML = '<p>공지사항을 불러오는 중 오류가 발생했습니다.</p>';
    }
}

function renderNotices(notices) {
    const container = document.getElementById('notice-container');
    container.innerHTML = ''; 

    let currentGroup = "";

    notices.forEach(notice => {
        // notice.date 형식: "2026-04-20-14-30-00" 가정
        // 앞에서 7글자만 추출하여 "2026-04" 그룹 만들기
        const yearMonthKey = notice.date.substring(0, 7); // "2026-04"
        const [year, month] = yearMonthKey.split('-');
        const yearMonthDisplay = `${year}년 ${parseInt(month)}월`;

        // 3. 새로운 년/월 그룹 헤더 생성
        if (currentGroup !== yearMonthKey) {
            currentGroup = yearMonthKey;
            const groupHeader = document.createElement('h2');
            groupHeader.className = 'group-header';
            groupHeader.innerHTML = `<span>📅</span> ${yearMonthDisplay}`;
            container.appendChild(groupHeader);
        }

        // 4. 공지 아이템 생성
        const noticeCard = document.createElement('div');
        noticeCard.className = 'notice-card';

        // 날짜 가독성 개선 (예: 2026-04-20-14-30-00 -> 2026-04-20 14:30)
        // 사용자가 보기 편하게 형식을 조금 다듬어서 노출하는 것을 추천합니다.
        const formattedDate = notice.date.replace(/-/g, (m, i) => (i === 10 ? ' ' : i > 10 && i % 3 === 2 ? ':' : '-')).substring(0, 16);

        noticeCard.innerHTML = `
            <div class="notice-time">${formattedDate}</div>
            <div class="notice-title"><h3>${notice.title}</h3></div>
            <div class="notice-body"><p>${notice.body.replace(/\n/g, '<br>')}</p></div>
        `;
        
        container.appendChild(noticeCard);
    });
}
