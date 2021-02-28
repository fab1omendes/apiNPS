import { Request, Response } from "express"
import { resolve } from 'path'
import { getCustomRepository } from "typeorm"
import { AppError } from "../errors/appErrors";
import { SurveysRepository } from "../repositories/surveysRepository";
import { SurveysUsersRepository } from "../repositories/surveysUsersRepository";
import { UsersRepository } from "../repositories/usersRepository"
import sendMailService from "../services/sendMailService";


class SendMailController {
    async execute(request: Request, response: Response) {
        const { email, survey_id } = request.body

        const usersRepository = getCustomRepository(UsersRepository)
        const surveysRepository = getCustomRepository(SurveysRepository)
        const surveysUsersRepository = getCustomRepository(SurveysUsersRepository)

        const userAlreadyExists = await usersRepository.findOne({ email })

        if (!userAlreadyExists) {
            throw new AppError("User does not exists!")
        }

        const survey = await surveysRepository.findOne({ id: survey_id })

        if (!survey) {
            throw new AppError("Survey does not exists!")
        }

        const npsPath = resolve(__dirname, "..", "views", "emails", "npsMail.hbs")

        const surveyUserAlreadyExists = await surveysUsersRepository.findOne({
            where: { user_id: userAlreadyExists.id, value: null },
            relations: ["user", "survey"]
        })

        const variables = {
            name: userAlreadyExists.name,
            title: survey.title,
            description: survey.description,
            id: "",
            link: process.env.URL_MAIL
        }

        if (surveyUserAlreadyExists) {
            variables.id = surveyUserAlreadyExists.id
            await sendMailService.execute(email, survey.title, variables, npsPath)
            return response.json(surveyUserAlreadyExists)
        }

        //Salvar as informações na tabela surveyUser
        const surveyUser = surveysUsersRepository.create({
            user_id: userAlreadyExists.id,
            survey_id
        })

        await surveysUsersRepository.save(surveyUser)

        variables.id = surveyUser.id

        await sendMailService.execute(email, survey.title, variables, npsPath)

        //Enviar e-mail para o usuário

        return response.json(surveyUser)
    }
}
export { SendMailController }