document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");

    const headers = {
        "x-auth-token": token,
    };

    // Fetch and populate billing data
    const populateBillingData = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/profile', { headers });
            if (!res.ok) {
                localStorage.removeItem("token");
                window.location.href = "login.html";
                return;
            }
            const user = await res.json();

            // Populate Current Plan
            if (user.plan) {
                document.querySelector(".plan-name").textContent = user.plan.name;
                document.querySelector(".plan-price").textContent = `£${user.plan.price.toFixed(2)} / month`;
                const renewsDate = new Date(user.plan.renewsOn);
                document.querySelector(".plan-details span").textContent = renewsDate.toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                });
            }

            // Populate Billing History
            if (user.billingHistory && user.billingHistory.length > 0) {
                const historyTableBody = document.querySelector(".billing-history-table tbody");
                historyTableBody.innerHTML = user.billingHistory.map(item => {
                    const itemDate = new Date(item.date);
                    return `
                        <tr>
                            <td>${itemDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                            <td>${item.description}</td>
                            <td>£${item.amount.toFixed(2)}</td>
                            <td><a href="#" class="text-blue-400 hover:underline">Download</a></td>
                        </tr>
                    `;
                }).join('');
            }

        } catch (err) {
            console.error("Failed to fetch billing data:", err);
        }
    };

    // Initial data load
    populateBillingData();
});
