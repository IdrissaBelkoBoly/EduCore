import React from "react";
import { CheckSquare } from "lucide-react";
import HomeworkReviewList from "./HomeworkReviewList";

const TeacherHomeworks = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 flex items-center gap-2">
            <CheckSquare className="text-pink-600" size={28} />
            Devoirs à corriger
          </h1>
          <p className="text-sm text-neutral-500">
            Examinez et notez les travaux rendus par vos étudiantes.
          </p>
        </div>
      </div>

      {/* Tableau des corrections uniquement */}
      <HomeworkReviewList />
    </div>
  );
};

export default TeacherHomeworks;
