import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { apiGet } from "../../../services/api-client";
import { TeacherProfileView } from "../../profile/teacher-profile-view";

type AuthContext = {
  auth: { user: { id: string; role: "student" | "teacher"; email: string } };
};

type Profile = {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  subject: string;
  level?: string;
  isVerified?: boolean;
  teachingLevel?: "lycee" | "cem";
  currentPosition?: string;
  experienceYears?: number;
};

type PublicProfileView = {
  profile: Profile;
  contents: Array<{ id: string; title: string; type: "video" | "pdf"; price: number; currency: string; isPaid: boolean }>;
  offers: Array<{ id: string; title: string; price: number; currency: string; description: string }>;
};

type Subscriber = {
  id: string;
  studentId: string;
  status: "active" | "canceled";
};

export function SubscriberCountCard({ count }: { count: number }) {
  const { t } = useTranslation();
  return (
    <div className="dashboard-card">
      <h3>{t("teacherPages.subscribersTitle")}</h3>
      <div className="dashboard-value">{count}</div>
      <p>{t("teacherPages.totalSubscribers")}</p>
    </div>
  );
}

export function TeacherProfilePage() {
  const { auth } = useOutletContext<AuthContext>();
  const { t } = useTranslation();
  const [privateProfile, setPrivateProfile] = useState<Profile | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicProfileView | null>(null);
  const [subscriberCount, setSubscriberCount] = useState(0);

  useEffect(() => {
    apiGet<Profile>("/profiles/me").then((response) => {
      if (response.data) {
        setPrivateProfile(response.data as Profile);
      }
    });
    apiGet<PublicProfileView>(`/public-profiles/${auth.user.id}`).then((response) => {
      if (response.data) {
        setPublicProfile(response.data as PublicProfileView);
      }
    });

    apiGet<Subscriber[]>("/subscriptions").then((response) => {
      if (response.data) {
        setSubscriberCount(response.data.length);
      } else {
        setSubscriberCount(0);
      }
    });
  }, [auth.user.id]);

  return (
    <section className="dashboard-section">
      <div className="dashboard-header">
        <div>
          <h1>{t("teacherPages.teacherProfileTitle")}</h1>
        </div>
        <div className="dashboard-actions">
          <a className="btn btn-ghost" href="/onboarding/teacher-profile">
            {t("teacherPages.updateProfile")}
          </a>
        </div>
      </div>
      <div className="dashboard-columns">
        <div className="dashboard-card">
          <h3>{t("teacherPages.privateProfileTitle")}</h3>
          {privateProfile ? (
            <div className="profile-block">
              {privateProfile.firstName || privateProfile.lastName ? (
                <p>
                  <strong>{t("teacherPages.privateLabels.name")}:</strong>{" "}
                  {[privateProfile.firstName, privateProfile.lastName].filter(Boolean).join(" ")}
                </p>
              ) : null}
              <p><strong>{t("teacherPages.privateLabels.subject")}:</strong> {privateProfile.subject}</p>
              {privateProfile.level ? <p><strong>{t("teacherPages.privateLabels.grade")}:</strong> {privateProfile.level}</p> : null}
              {privateProfile.bio ? <p><strong>{t("teacherPages.privateLabels.bio")}:</strong> {privateProfile.bio}</p> : null}
              {privateProfile.teachingLevel ? (
                <p><strong>{t("teacherPages.privateLabels.teachingLevel")}:</strong> {privateProfile.teachingLevel}</p>
              ) : null}
              {privateProfile.currentPosition ? <p><strong>{t("teacherPages.privateLabels.position")}:</strong> {privateProfile.currentPosition}</p> : null}
              {typeof privateProfile.experienceYears === "number" ? (
                <p><strong>{t("teacherPages.privateLabels.experience")}:</strong> {privateProfile.experienceYears} {t("teacherPages.privateLabels.years")}</p>
              ) : null}
            </div>
          ) : (
            <p>{t("teacherPages.loading")}</p>
          )}
        </div>
        <div className="dashboard-card">
          <h3>{t("teacherPages.publicProfileTitle")}</h3>
          {publicProfile ? <TeacherProfileView data={publicProfile} mode="preview" /> : <p>{t("teacherPages.loading")}</p>}
        </div>
        <SubscriberCountCard count={subscriberCount} />
      </div>
    </section>
  );
}
