import "../css/Team.css";
import Navbar from "../components/Navbar";

function Team() {
  const teamMembers = [
    {
      name: "NARKIDIMILLI VASAVI",
      role: "Machine Learning Engineer",
      photo: "/team/image.png"
    },
    {
      name: "VADDI HANUMANTHA RAO",
      role: "Backend Developer",
      photo: "/team/image.png"
    },
    {
      name: "SALADI NAGA SANDEEP",
      role: "Tester",
      photo: "/team/image.png"
    },
    {
      name: "K LAKSHMINI PARVATHI",
      role: "Frontend Developer",
      photo: "/team/image.png"
    }
  ];

  return (
    <>
      <Navbar />
      <section className="section team-section">
        <div className="team-header">
          <h2 className="section-title">Meet Our Team</h2>
          <p className="team-subtitle">The brilliant minds behind the project</p>
        </div>

        <div className="team-grid">
          {teamMembers.map((member, index) => (
            <div 
              className={`team-card ${index % 2 === 0 ? 'slide-left' : 'slide-right'}`} 
              key={index}
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              <div className="card-inner">
                <div className="image-wrapper">
                  <img src={member.photo} alt={member.name} />
                  <div className="image-overlay"></div>
                </div>
                <div className="card-content">
                  <h3>{member.name}</h3>
                  <p className="role">{member.role}</p>
                  <div className="role-underline"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default Team;