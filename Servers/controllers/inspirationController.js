import Inspiration from "../models/Inspiration.js";

/**
 * @desc    Récupérer toutes les inspirations de la galerie (Grille d'images à droite)
 * @route   GET /api/inspirations
 * @access  Private
 */
export const getInspirations = async (req, res) => {
  try {
    const { category } = req.query;
    let query = { isActive: true };

    // Si une catégorie est passée en paramètre (ex: ?category=Nail Art), on filtre la grille
    if (category) {
      query.category = category;
    }

    // On trie par date de création pour afficher les poses les plus récentes en premier
    const inspirations = await Inspiration.find(query)
      .populate("createdBy", "nom avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: inspirations.length,
      data: inspirations,
    });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Erreur lors de la récupération de la galerie",
        error: error.message,
      });
  }
};

/**
 * @desc    Ajouter une nouvelle photo à la galerie (Admin uniquement)
 * @route   POST /api/inspirations
 * @access  Private/Admin
 */
export const createInspiration = async (req, res) => {
  try {
    const { title, imageUrl, category, tags, linkedCourse } = req.body;

    const inspiration = await Inspiration.create({
      title,
      imageUrl,
      category,
      tags,
      linkedCourse,
      createdBy: req.user.id, // L'ID de l'admin connectée (Amélie)
    });

    res.status(201).json({
      success: true,
      message: "Inspiration ajoutée avec succès à la galerie",
      data: inspiration,
    });
  } catch (error) {
    res
      .status(400)
      .json({
        message: "Erreur lors de l'ajout de l'inspiration",
        error: error.message,
      });
  }
};

/**
 * @desc    Liker / Ajouter une photo aux favoris d'une étudiante
 * @route   PUT /api/inspirations/:id/like
 * @access  Private (Étudiante uniquement)
 */
export const toggleLikeInspiration = async (req, res) => {
  try {
    const inspiration = await Inspiration.findById(req.params.id);

    if (!inspiration) {
      return res.status(404).json({ message: "Inspiration non trouvée" });
    }

    // Vérifier si l'étudiante a déjà mis un j'aime sur cette photo
    const likeIndex = inspiration.likes.indexOf(req.user.id);

    if (likeIndex > -1) {
      // Si elle a déjà aimé, on retire son ID (Unlike)
      inspiration.likes.splice(likeIndex, 1);
    } else {
      // Sinon, on ajoute son ID (Like)
      inspiration.likes.push(req.user.id);
    }

    await inspiration.save();

    res.status(200).json({
      success: true,
      data: inspiration,
    });
  } catch (error) {
    res
      .status(400)
      .json({
        message: "Erreur lors de la modification du mention J'aime",
        error: error.message,
      });
  }
};

/**
 * @desc    Supprimer une inspiration de la galerie (Admin uniquement)
 * @route   DELETE /api/inspirations/:id
 * @access  Private/Admin
 */
export const deleteInspiration = async (req, res) => {
  try {
    const inspiration = await Inspiration.findById(req.params.id);

    if (!inspiration) {
      return res.status(404).json({ message: "Inspiration non trouvée" });
    }

    await inspiration.deleteOne();

    res.status(200).json({
      success: true,
      message: "Inspiration retirée de la galerie",
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erreur lors de la suppression", error: error.message });
  }
};
