import { useEffect, useState } from "react";
import API from "../api/axios";
import Navbar from "../components/Navbar";

export default function Billing() {
  const [subscription, setSubscription] = useState(null);

  const fetchSubscription = async () => {
    try {
      const res = await API.get("/subscriptions/me");
      setSubscription(res.data);
    } catch (err) {
      alert("Failed to load subscription");
    }
  };

  const upgradeToPro = async () => {
    try {
      const res = await API.post("/subscriptions/create-checkout-session");
      window.location.href = res.data.checkout_url;
    } catch (err) {
      alert("Failed to start checkout");
    }
  };

  const cancelSubscription = async () => {
    if (!window.confirm("Are you sure you want to cancel your subscription?")) return;
    try {
      await API.post("/subscriptions/cancel-subscription");
      alert("Subscription canceled");
      fetchSubscription();
    } catch (err) {
      alert("Cancel failed");
    }
  };

  useEffect(() => { fetchSubscription(); }, []);

  const plan = subscription?.plan || "free";
  const status = subscription?.status || "inactive";

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Navbar />
      <div style={{ padding: "30px", maxWidth: "700px", margin: "0 auto" }}>
        <h2 style={{ color: "#1e293b" }}>Billing & Subscription</h2>

        {subscription ? (
          <>
            {/* CURRENT PLAN */}
            <div style={planCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, color: "#1e293b" }}>Current Plan</h3>
                  <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "13px" }}>Your active subscription details</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ ...planBadge, background: plan === "pro" ? "#ddd6fe" : "#e0e7ff", color: plan === "pro" ? "#5b21b6" : "#3730a3" }}>
                    {plan.toUpperCase()}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: "20px", display: "flex", gap: "20px" }}>
                <div style={statBox}>
                  <div style={{ color: "#64748b", fontSize: "12px" }}>Status</div>
                  <div style={{ color: status === "active" ? "#16a34a" : "#dc2626", fontWeight: "700", fontSize: "16px" }}>{status}</div>
                </div>
                <div style={statBox}>
                  <div style={{ color: "#64748b", fontSize: "12px" }}>Projects</div>
                  <div style={{ color: "#1e293b", fontWeight: "700", fontSize: "16px" }}>{plan === "pro" ? "10" : "3"} max</div>
                </div>
              </div>
            </div>

            {/* PLAN COMPARISON */}
            <div style={{ display: "flex", gap: "16px", marginTop: "20px" }}>
              <PlanBox
                name="Free"
                price="$0/mo"
                features={["3 Projects", "Basic support", "Team access"]}
                current={plan === "free"}
              />
              <PlanBox
                name="Pro"
                price="$9/mo"
                features={["10 Projects", "Priority support", "Advanced analytics", "Unlimited teams"]}
                current={plan === "pro"}
                highlighted
              />
            </div>

            <div style={{ marginTop: "24px" }}>
              {plan === "free" ? (
                <button onClick={upgradeToPro} style={upgradeBtn}>🚀 Upgrade to Pro</button>
              ) : status === "active" ? (
                <button onClick={cancelSubscription} style={cancelBtn}>Cancel Subscription</button>
              ) : (
                <button onClick={upgradeToPro} style={upgradeBtn}>🔄 Reactivate</button>
              )}
            </div>
          </>
        ) : (
          <p>Loading subscription...</p>
        )}
      </div>
    </div>
  );
}

function PlanBox({ name, price, features, current, highlighted }) {
  return (
    <div style={{
      flex: 1,
      border: `2px solid ${highlighted ? "#7c3aed" : "#e2e8f0"}`,
      borderRadius: "12px",
      padding: "20px",
      background: highlighted ? "#faf5ff" : "white",
      position: "relative"
    }}>
      {current && <span style={currentBadge}>Current</span>}
      <h3 style={{ margin: 0, color: highlighted ? "#7c3aed" : "#1e293b" }}>{name}</h3>
      <p style={{ fontSize: "22px", fontWeight: "bold", color: "#1e293b", margin: "8px 0" }}>{price}</p>
      <ul style={{ paddingLeft: "18px", color: "#64748b", fontSize: "13px" }}>
        {features.map((f, i) => <li key={i} style={{ marginBottom: "4px" }}>✓ {f}</li>)}
      </ul>
    </div>
  );
}

const planCard = { background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px" };
const planBadge = { display: "inline-block", padding: "4px 14px", borderRadius: "99px", fontSize: "13px", fontWeight: "700" };
const statBox = { background: "#f8fafc", borderRadius: "8px", padding: "12px 20px", textAlign: "center" };
const upgradeBtn = { padding: "11px 24px", background: "#7c3aed", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "15px", fontWeight: "600" };
const cancelBtn = { padding: "11px 24px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "15px" };
const currentBadge = { position: "absolute", top: "12px", right: "12px", background: "#dcfce7", color: "#166534", fontSize: "11px", padding: "2px 8px", borderRadius: "99px", fontWeight: "600" };
