import React, { useState } from "react";

const CertificatesTab = ({
  certificates = [],
  moduleValidations = [],
  formatUrl,
  user = {}, // Objet utilisateur contenant le profil de l'élève connecté
}) => {
  const [dismissedIndexes, setDismissedIndexes] = useState([]);

  const getCleanUrl = (url) => {
    if (!url) return "#";
    if (typeof formatUrl === "function") {
      return formatUrl(url);
    }
    return url.startsWith("http") ? url : `http://${url}`;
  };

  // 🔹 Utilitaire centralisé pour extraire le nom complet de l'étudiant
  const getStudentName = (cert) => {
    // 1. Cherche dans l'objet "student" du certificat (ex: cert.student.prenom + cert.student.nom)
    if (cert?.student) {
      if (typeof cert.student === "object") {
        const prenom = cert.student.prenom || cert.student.firstName || "";
        const nom =
          cert.student.nom || cert.student.lastName || cert.student.name || "";
        const fullName = `${prenom} ${nom}`.trim();
        if (fullName) return fullName;
      } else if (typeof cert.student === "string") {
        return cert.student;
      }
    }

    // 2. Cherche si les propriétés sont directement à la racine du certificat
    if (cert?.studentName) return cert.studentName;

    // 3. Fallback sur les données de l'utilisateur connecté (prop `user`)
    const userPrenom = user?.prenom || user?.firstName || "";
    const userNom = user?.nom || user?.lastName || user?.name || "";
    const userFullName = `${userPrenom} ${userNom}`.trim();

    if (userFullName) return userFullName;
    if (user?.email) return user.email.split("@")[0];

    return "Étudiante";
  };

  // 🏆 🎓 FONCTION D'IMPRESSION DU CERTIFICAT A4
  const handlePrintCertificate = (cert) => {
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert(
        "Veuillez autoriser les fenêtres surgissantes dans votre navigateur.",
      );
      return;
    }

    // Récupération dynamique du nom de l'étudiant
    const studentName = getStudentName(cert);

    const courseTitle =
      cert?.title ||
      cert?.titre ||
      cert?.courseTitle ||
      "Stylisme & Prothésie Ongulaire";

    const certificateId =
      cert?.certificateNumber ||
      cert?._id ||
      `CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const issueDateRaw =
      cert?.issuedAt || cert?.approvedAt || cert?.updatedAt || cert?.createdAt;
    const formattedDate = issueDateRaw
      ? new Date(issueDateRaw).toLocaleDateString("fr-FR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : new Date().toLocaleDateString("fr-FR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

    printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Certificat - ${studentName}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 0;
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Georgia', 'Times New Roman', serif;
            background-color: #faf9f6;
            margin: 0;
            padding: 30px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            color: #2c2c2c;
          }
          .certificate-border {
            border: 10px double #b8860b;
            padding: 30px 50px;
            background-color: #ffffff;
            width: 100%;
            max-width: 1000px;
            text-align: center;
            position: relative;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          }
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 260px;
            color: rgba(212, 175, 55, 0.03);
            font-weight: bold;
            pointer-events: none;
            z-index: 0;
          }
          .content { position: relative; z-index: 1; }
          .academy-title {
            font-size: 14px;
            letter-spacing: 4px;
            text-transform: uppercase;
            color: #777;
            margin-bottom: 5px;
          }
          .main-title {
            font-size: 38px;
            color: #1a1a1a;
            text-transform: uppercase;
            letter-spacing: 5px;
            font-weight: bold;
            margin: 0;
          }
          .divider {
            width: 120px;
            height: 2px;
            background: linear-gradient(90deg, transparent, #b8860b, transparent);
            margin: 15px auto;
          }
          .certify-text {
            font-size: 16px;
            color: #555;
            font-style: italic;
            margin-top: 15px;
          }
          /* 📌 NOM DE L'ÉLÈVE MIS EN ÉVIDENCE */
          .student-name {
            font-size: 34px;
            color: #b8860b;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin: 15px 0;
            display: inline-block;
            border-bottom: 2px solid #d4af37;
            padding-bottom: 5px;
          }
          .description {
            font-size: 15px;
            color: #444;
            line-height: 1.6;
            margin: 15px auto;
            max-width: 750px;
          }
          .course-name {
            font-size: 20px;
            font-weight: bold;
            color: #1a1a1a;
          }
          .footer-section {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            padding: 0 30px;
          }
          .signature-box { text-align: center; }
          .signature-line {
            border-top: 1px solid #aaa;
            width: 160px;
            margin-top: 5px;
            padding-top: 5px;
            font-size: 12px;
            color: #555;
          }
          .gold-seal {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: radial-gradient(circle, #f9d976 0%, #e9b200 100%);
            border: 3px border-dashed #ffffff;
            box-shadow: 0 0 0 4px #e9b200, 0 4px 10px rgba(0,0,0,0.15);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: #fff;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .cert-id {
            position: absolute;
            bottom: 12px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 10px;
            color: #aaa;
            letter-spacing: 1.5px;
          }
        </style>
      </head>
      <body>
        <div class="certificate-border">
          <div class="watermark">🎓</div>
          
          <div class="content">
            <div class="academy-title">Institut & Académie de Beauté</div>
            <h1 class="main-title">Certificat de Réussite</h1>
            <div class="divider"></div>

            <p class="certify-text">Ce présent certificat est officiellement décerné à :</p>
            
            <!-- AFFICHAGE DU NOM DE L'ÉLÈVE SUR LE CERTIFICAT -->
            <div class="student-name">${studentName}</div>

            <p class="description">
              Pour avoir suivi avec succès l'ensemble du programme de formation professionnelle et démontré une parfaite maîtrise théorique et pratique en :<br/>
              <span class="course-name">« ${courseTitle} »</span>
            </p>

            <div class="footer-section">
              <div class="signature-box">
                <p style="font-size: 12px; color: #666; margin-bottom: 5px;">Délivré le : <strong>${formattedDate}</strong></p>
                <div class="signature-line">Date de délivrance</div>
              </div>

              <div class="gold-seal">
                <span>★ ★ ★</span>
                <span>OFFICIEL</span>
                <span>CERTIFIÉ</span>
              </div>

              <div class="signature-box">
                <img src="/signature.png" alt="Signature" style="max-width: 120px; height: auto;" onerror="this.style.display='none'" />
                <div class="signature-line">La Direction / Formatrice</div>
              </div>
            </div>

            <div class="cert-id">N° de vérification : ${certificateId}</div>
          </div>
        </div>
      </body>
    </html>
    `);

    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };

  const handleDismiss = (indexToDelete) => {
    setDismissedIndexes((prev) => [...prev, indexToDelete]);
  };

  const finalCertificates = certificates.filter(
    (c) =>
      c.isFinal ||
      c.type === "final" ||
      c.pdfUrl ||
      (!c.course && !c.courseTitle && !c.customMessage),
  );

  const rawEncouragements =
    moduleValidations.length > 0
      ? moduleValidations
      : certificates.filter(
          (c) =>
            !c.isFinal &&
            c.type !== "final" &&
            (c.course ||
              c.courseTitle ||
              c.message ||
              c.encouragementMessage ||
              c.congratulationsMessage ||
              c.customMessage),
        );

  const filteredEncouragements = rawEncouragements.filter(
    (_, index) => !dismissedIndexes.includes(index),
  );

  return (
    <div className="space-y-10 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-serif font-bold text-neutral-900">
          Mes Certifications & Suivi
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Consultez vos validations de modules et imprimez votre diplôme
          officiel.
        </p>
      </div>

      {/* SECTION 1 : CERTIFICAT GLOBAL */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-200/80 pb-2">
          <h3 className="text-lg font-serif font-bold text-neutral-900 flex items-center gap-2">
            <span>🏆</span> Certificat Officiel Global
          </h3>
          <span className="text-xs text-neutral-400 font-medium">
            Fin de cursus
          </span>
        </div>

        {finalCertificates.length === 0 ? (
          <div className="bg-amber-50/60 border border-amber-200/80 p-6 rounded-2xl flex items-start sm:items-center gap-4">
            <span className="text-3xl shrink-0">🎓</span>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Certificat Final en cours d'acquisition
              </h4>
              <p className="text-xs text-amber-800/80 leading-relaxed">
                Validez l'ensemble de vos modules de formation pour débloquer
                votre diplôme officiel.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {finalCertificates.map((cert, index) => {
              const hasPdf = Boolean(cert.pdfUrl);
              const issueDate =
                cert.issuedAt || cert.approvedAt || cert.createdAt;
              const studentName = getStudentName(cert);

              return (
                <div
                  key={
                    cert._id ? `final-${cert._id}-${index}` : `final-${index}`
                  }
                  className="bg-linear-to-br from-neutral-900 to-neutral-800 text-white p-6 rounded-2xl shadow-md flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 bg-amber-400/20 text-amber-300 rounded-full text-[10px] font-bold border border-amber-400/30">
                        📜 Diplôme Officiel
                      </span>
                      <span className="text-xs text-neutral-400">
                        {issueDate
                          ? new Date(issueDate).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })
                          : "Date non spécifiée"}
                      </span>
                    </div>

                    <h4 className="font-bold text-base text-white">
                      {cert.title ||
                        cert.titre ||
                        "Certificat de Réussite Globale"}
                    </h4>

                    {/* 📌 AFFICHAGE DU NOM DE L'ÉLÈVE SUR LA CARTE REACT */}
                    <div className="bg-neutral-800/90 border border-neutral-700/60 px-3 py-2 rounded-xl flex items-center justify-between">
                      <span className="text-[11px] text-neutral-400">
                        Titulaire :
                      </span>
                      <span className="text-xs font-semibold text-amber-300">
                        👤 {studentName}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-300 leading-relaxed">
                      Attestation officielle confirmant la maîtrise globale des
                      compétences dispensées durant la formation.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-neutral-700/60">
                    {hasPdf ? (
                      <a
                        href={getCleanUrl(cert.pdfUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-2 no-underline cursor-pointer"
                      >
                        <span>Télécharger le Certificat (PDF)</span>
                        <span className="text-sm">📥</span>
                      </a>
                    ) : (
                      <button
                        onClick={() => handlePrintCertificate(cert)}
                        className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
                      >
                        <span>Imprimer le Diplôme Officiel</span>
                        <span className="text-sm">🖨️</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 2 : MOTS D'ENCOURAGEMENT */}
      <section className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-neutral-200/80 pb-2">
          <h3 className="text-lg font-serif font-bold text-neutral-900 flex items-center gap-2">
            <span>✨</span> Mots d'Encouragement par Module
          </h3>
          <span className="text-xs text-neutral-400 font-medium">
            Progression continue
          </span>
        </div>

        {filteredEncouragements.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl text-center border border-neutral-100 shadow-sm space-y-2">
            <span className="text-3xl block">💬</span>
            <h4 className="text-sm font-bold text-neutral-700">
              Aucun mot d'encouragement
            </h4>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
              Dès que vous validez un module, le message de félicitation de
              votre formateur apparaîtra ici.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredEncouragements.map((item, index) => {
              const message =
                item.encouragementMessage || item.customMessage || item.message;
              const courseTitle =
                item.courseTitle || item.title || item.name || "Module Validé";
              const issueDate =
                item.issuedAt || item.approvedAt || item.createdAt;
              const studentName = getStudentName(item);

              return (
                <div
                  key={item._id ? `enc-${item._id}-${index}` : `enc-${index}`}
                  className="relative bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-all"
                >
                  <button
                    onClick={() => handleDismiss(index)}
                    title="Masquer cet encouragement"
                    className="absolute top-4 right-4 w-7 h-7 bg-neutral-100 hover:bg-rose-100 text-neutral-400 hover:text-rose-600 rounded-full flex items-center justify-center transition-colors cursor-pointer text-xs font-bold"
                  >
                    ✕
                  </button>

                  <div className="space-y-3 pr-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-xl shrink-0">
                        ✅
                      </div>
                      <div>
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold border border-emerald-200/60 inline-block mb-1">
                          Module Acquis
                        </span>
                        <h4 className="font-bold text-neutral-900 text-sm leading-snug">
                          {courseTitle}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-neutral-500 font-medium pt-1">
                      <span>
                        👤 Élève :{" "}
                        <strong className="text-neutral-700">
                          {studentName}
                        </strong>
                      </span>
                      <span>
                        🗓️{" "}
                        {issueDate
                          ? new Date(issueDate).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })
                          : "Date non spécifiée"}
                      </span>
                    </div>

                    {message && (
                      <div className="bg-emerald-50/70 border border-emerald-100 p-3.5 rounded-xl text-xs space-y-1">
                        <p className="font-semibold text-emerald-900 flex items-center gap-1">
                          <span>💬</span> Mot de la formatrice :
                        </p>
                        <p className="italic text-emerald-800 leading-relaxed font-serif">
                          « {message} »
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default CertificatesTab;
